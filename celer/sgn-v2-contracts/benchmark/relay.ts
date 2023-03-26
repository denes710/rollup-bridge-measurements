import '@nomiclabs/hardhat-ethers';

import fs from 'fs';
import path from 'path';

import { ethers } from 'hardhat';

import { keccak256 } from '@ethersproject/solidity';
import { parseUnits } from '@ethersproject/units';
import { Wallet } from '@ethersproject/wallet';

import { Bridge, TestERC20 } from '../typechain';
import { deployBridgeContracts, getAccounts, loadFixture } from '../test/lib/common';
import { getRelayRequest } from '../test/lib/proto';
import { BigNumber } from '@ethersproject/bignumber';
import { serialize } from '@ethersproject/transactions';


const GAS_USAGE_DIR = 'reports/gas_usage/';
const GAS_USAGE_LOG = path.join(GAS_USAGE_DIR, 'relay.txt');

describe('Relay Gas Benchmark', function () {
  if (!fs.existsSync(GAS_USAGE_DIR)) {
    fs.mkdirSync(GAS_USAGE_DIR, { recursive: true });
  }
  fs.rmSync(GAS_USAGE_LOG, { force: true });
  fs.appendFileSync(GAS_USAGE_LOG, '<validatorNum, quorumSigNum, gasCost> for executing a bridge message\n\n');

  async function fixture([admin]: Wallet[]) {
    const { bridge, token } = await deployBridgeContracts(admin);
    return { admin, bridge, token };
  }

  let bridge: Bridge;
  let token: TestERC20;
  let admin: Wallet;
  let accounts: Wallet[];
  let busReceiver;
  let msgExampleBasic;

  const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
  async function getL1EstimatedGasCost(rawTx, user) {
    rawTx = await user.populateTransaction(rawTx);
    const bytes = serialize({
      data: rawTx.data,
      to: rawTx.to,
      gasPrice: rawTx.gasPrice,
      type: rawTx.type,
      gasLimit: rawTx.gasLimit,
      nonce: 0xffffffff,
    });

    return bytes;
  }
  beforeEach(async () => {
    const res = await loadFixture(fixture);
    bridge = res.bridge;
    token = res.token;
    admin = res.admin;
    accounts = await getAccounts(admin, [token], 21);
    await token.transfer(bridge.address, parseUnits('1000000'));
    await bridge.setEpochVolumeCaps([token.address], [parseUnits('100')]);
    await bridge.setEpochLength(5);
    await bridge.setDelayThresholds([token.address], [parseUnits('100')])

    const BusReceiverFactory = await ethers.getContractFactory("MessageBusReceiver");
    busReceiver = await BusReceiverFactory.deploy(bridge.address, ZERO_ADDRESS, ZERO_ADDRESS, ZERO_ADDRESS, ZERO_ADDRESS);

    const MsgExampleBasicFactory = await ethers.getContractFactory("MsgExampleBasic");
    msgExampleBasic = await MsgExampleBasicFactory.deploy(busReceiver.address);
  });

  it('benchmark relay gas cost for bridge', async function () {
    let perSigCost;
    for (let i = 5; i <= 21; i += 2) {
      perSigCost = await doBenchmarkRelaySig(i);
    }
    fs.appendFileSync(GAS_USAGE_LOG, 'per sig cost: ' + perSigCost + '\n');
    fs.appendFileSync(GAS_USAGE_LOG, '\n');

    const perSignerCost = await doBenchmarkRelaySigner(21, 8);
    fs.appendFileSync(GAS_USAGE_LOG, 'per validator cost: ' + perSignerCost + '\n');
  });

  async function getPowers(
    accounts: Wallet[],
    signerNum: number,
    quorumSigNum: number
  ): Promise<{ signers: Wallet[]; addrs: string[]; powers: BigNumber[] }> {
    const signers: Wallet[] = [];
    const addrs: string[] = [];
    const powers: BigNumber[] = [];
    for (let i = 0; i < signerNum; i++) {
      signers.push(accounts[i]);
      addrs.push(accounts[i].address);
      if (i == quorumSigNum - 1) {
        powers.push(parseUnits('100'));
      } else {
        powers.push(parseUnits('1'));
      }
    }
    return { signers, addrs, powers };
  }

  async function doBenchmarkRelaySig(signerNum: number) {
    let firstCost = 0;
    let lastCost = 0;
    const maxQuorumSigNum = ((signerNum * 2) / 3 + 1) | 0;
    for (let i = 3; i <= maxQuorumSigNum; i += 2) {
      const gasUsed = await doBenchmarkRelay(signerNum, i);
      if (i == 3) {
        firstCost = gasUsed.toNumber();
      }
      lastCost = gasUsed.toNumber();
    }
    const perSigCost = Math.ceil((lastCost - firstCost) / (maxQuorumSigNum - 3));
    return perSigCost;
  }

  async function doBenchmarkRelaySigner(maxSignerNum: number, quorumSigNum: number) {
    let firstCost = 0;
    let lastCost = 0;
    const minSignerNum = ((quorumSigNum * 3) / 2) | 0;
    for (let i = minSignerNum; i <= maxSignerNum; i++) {
      const gasUsed = await doBenchmarkRelay(i, quorumSigNum);
      if (i == minSignerNum) {
        firstCost = gasUsed.toNumber();
      }
      lastCost = gasUsed.toNumber();
    }
    const perSignerCost = Math.ceil((lastCost - firstCost) / (maxSignerNum - minSignerNum));
    return perSignerCost;
  }

  async function doBenchmarkRelay(signerNum: number, quorumSigNum: number) {
    if (quorumSigNum > signerNum) {
      quorumSigNum = signerNum;
    }
    const { signers, addrs, powers } = await getPowers(accounts, signerNum, quorumSigNum);
    await bridge.notifyResetSigners();
    await bridge.resetSigners(addrs, powers);

    const sender = accounts[0];
    const receiver = accounts[1];
    const amount = parseUnits('1');
    const chainId = (await ethers.provider.getNetwork()).chainId;
    const srcXferId = keccak256(['uint64'], [Date.now()]); // fake src xfer id
    const { relayBytes, sigs } = await getRelayRequest(
      sender.address,
      receiver.address,
      token.address,
      amount,
      chainId,
      chainId,
      srcXferId,
      signers,
      bridge.address
    );

    const route = {
      sender: msgExampleBasic.address,
      senderBytes: [],
      receiver: msgExampleBasic.address,
      srcChainId: 420,
      srcTxHash: "0x1111111111111111111111111111111111111111111111111111111111111111"
    };

    const gasUsed = (await (await busReceiver.functions['executeMessage(bytes,(address,bytes,address,uint64,bytes32),bytes[],address[],uint256[],string)'](relayBytes, route, sigs, addrs, powers, "Relay")).wait()).gasUsed;

    const OptimismGasHelperFactory = await ethers.getContractFactory("OptimismGasHelper");
    const optimismGasHelper = await OptimismGasHelperFactory.deploy(30_000_000_000);

    const rawTx = await busReceiver.connect(sender).populateTransaction['executeMessage(bytes,(address,bytes,address,uint64,bytes32),bytes[],address[],uint256[],string)'](relayBytes, route, sigs, addrs, powers, "Relay");
    const bytes = await getL1EstimatedGasCost(rawTx, sender);
    const estimatedL1ForL2 = await optimismGasHelper.getL1Fee(bytes);

    fs.appendFileSync(GAS_USAGE_LOG, signerNum.toString() + '\t' + quorumSigNum.toString() + '\t' + gasUsed + '\t' + " L1 Fee in GWei: " + estimatedL1ForL2 / 10**9 + '\n');
    return gasUsed;
  }
});
