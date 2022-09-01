require("dotenv").config()
import algosdk, { decodeAddress, Transaction } from "algosdk";
import * as fs from "fs";
import { Buffer } from "buffer";


const algod_token =
  "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const algod_host = "https://testnet-api.algonode.cloud";

(async function() {
  const client = new algosdk.Algodv2(algod_token, algod_host, '');
  const acct = algosdk.mnemonicToSecretKey(process.env['MNEMONIC'] || '');
  
  const buff = fs.readFileSync("../contract.json");
  const contract = new algosdk.ABIContract(JSON.parse(buff.toString()));
  const appId = 107309253

  const sp = await client.getTransactionParams().do();
  const commonParams = {
    appID: appId,
    sender: acct.addr,
    suggestedParams: sp,
    signer: algosdk.makeBasicAccountTransactionSigner(acct),
  };

  const comp = new algosdk.AtomicTransactionComposer();

  comp.addMethodCall({
    method: contract.getMethodByName("txntest"),
    methodArgs: [
      20000,
      {
        txn: new Transaction({
          from: acct.addr,
          to: acct.addr,
          amount: 20000,
          ...sp,
        }),
        signer: algosdk.makeBasicAccountTransactionSigner(acct),
      },
      1000,
    ],
    ...commonParams,
  });
  const results = await comp.execute(client, 2);
  for (const result of results.methodResults) {
    console.log(`${result.method.name} => ${result.returnValue}`);
  }
})();
