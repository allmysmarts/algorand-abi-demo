require("dotenv").config()
import algosdk, { decodeAddress, Transaction } from "algosdk";
import * as fs from "fs";
import { Buffer } from "buffer";

const algod_token =
  "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const algod_host = "https://testnet-api.algonode.cloud";

(async function () {
  // Create a client to communicate with local node
  const client = new algosdk.Algodv2(algod_token, algod_host, '');

  // Get account from mnemonic
  const acct = algosdk.mnemonicToSecretKey(process.env['MNEMONIC'] || '');

  // Read in the local contract.json file
  const buff = fs.readFileSync("../contract.json");

  // Parse the json file into an object, pass it to create an ABIContract object
  const contract = new algosdk.ABIContract(JSON.parse(buff.toString()));

  const appId = parseInt(fs.readFileSync("../.app_id").toString());
  console.log("App ID: ", appId);

  // We initialize the common parameters here, they'll be passed to all the transactions
  // since they happen to be the same
  const sp = await client.getTransactionParams().do();
  const commonParams = {
    appID: appId,
    sender: acct.addr,
    suggestedParams: sp,
    signer: algosdk.makeBasicAccountTransactionSigner(acct),
  };

  const comp = new algosdk.AtomicTransactionComposer();

  // Simple ABI Calls with standard arguments, return type
  comp.addMethodCall({
    method: contract.getMethodByName("add"),
    methodArgs: [1, 1],
    ...commonParams,
  });
  comp.addMethodCall({
    method: contract.getMethodByName("sub"),
    methodArgs: [3, 1],
    ...commonParams,
  });
  comp.addMethodCall({
    method: contract.getMethodByName("div"),
    methodArgs: [4, 2],
    ...commonParams,
  });
  comp.addMethodCall({
    method: contract.getMethodByName("mul"),
    methodArgs: [3, 3],
    ...commonParams,
  });

  //Tuple return type
  comp.addMethodCall({
    method: contract.getMethodByName("qrem"),
    methodArgs: [27, 5],
    ...commonParams,
  });

  // String return type
  comp.addMethodCall({
    method: contract.getMethodByName("reverse"),
    methodArgs: [Buffer.from("desrever yllufsseccus")],
    ...commonParams,
  });

  // Transaction being passed as an argument, this removes the transaction from the
  // args list, but includes it in the atomic grouped transaction
  comp.addMethodCall({
    method: contract.getMethodByName("txntest"),
    methodArgs: [
      10000,
      {
        txn: new Transaction({
          from: acct.addr,
          to: acct.addr,
          amount: 10000,
          ...sp,
        }),
        signer: algosdk.makeBasicAccountTransactionSigner(acct),
      },
      1000,
    ],
    ...commonParams,
  });

  // Here we call with 20 arguments to demonstrate Tuple encoding of any arguments past index 14
  comp.addMethodCall({
    method: contract.getMethodByName("manyargs"),
    methodArgs: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    ...commonParams,
  });

  // Pass in an account by address, the atc will take care of mapping this correctly
  comp.addMethodCall({
    method: contract.getMethodByName("min_bal"),
    methodArgs: ["FHWVNNZOALOSBKYFKEUIZC56SGPLLAREZFFWLXCPBBVVISXDLPTRFR7EIQ"],
    ...commonParams,
  });

  // Dynamic argument types are supported (undefined length array)
  comp.addMethodCall({
    method: contract.getMethodByName("concat_strings"),
    methodArgs: [["this", "string", "is", "joined"]],
    ...commonParams,
  });

  // This is not necessary to call but it is helpful for debugging
  // to see what is being sent to the network
  //for(const gtxn of comp.buildGroup()){ console.log(gtxn.txn.appArgs) }

  // We can also dryrun the group
  // const res = await comp.dryrun(client)
  // for(const tx of res.methodResults){ console.log(tx.returnValue) }

  // Finally, execute the composed group and print out the results
  const results = await comp.execute(client, 2);
  for (const result of results.methodResults) {
    console.log(`${result.method.name} => ${result.returnValue}`);
  }
})();
