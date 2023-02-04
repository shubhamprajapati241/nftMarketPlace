import { useState } from "react";
import { ethers } from "ethers";
import { useRouter } from "next/router";
import Web3Modal from "web3modal";

// setting up infura IPFS client
const { create } = require("ipfs-http-client");
import { projectId, projectSecret } from "../config";

const auth =
  "Basic " + Buffer.from(projectId + ":" + projectSecret).toString("base64");
const client = create({
  host: "ipfs.infura.io",
  port: 5001,
  protocol: "https",
  headers: {
    authorization: auth,
  },
});

// importing NFTAdress and NFT Market Contract address Address
import { nftaddress, nftmarketaddress } from "../config";
import NFT from "../artifacts/contracts/NFT.sol/NFT.json";
import NFTMarket from "../artifacts/contracts/NFTMarket.sol/NFTMarket.json";

//* 1. Adding the img on IPFS
//* 2. By FormInput adding the NFT data on IPFS
//* 3. Creating the sales on the marketplace

export default function CreateItem() {
  const [fileUrl, setFileUrl] = useState(null);
  const [formInput, updateFormInput] = useState({
    price: "",
    name: "",
    description: "",
  });

  const router = useRouter();

  async function onChange(e) {
    const file = e.target.files[0];

    try {
      // addding the image file into infura IPFS
      const added = await client.add(file, {
        progress: (prog) => console.log(`received:${prog}`),
      });
      const url = `https://nftmarket20.infura-ipfs.io/ipfs/${added.path}`;
      setFileUrl(url);
    } catch (error) {
      console.log("error uploading file, please try again:", error);
    }
  }

  async function CreateMarket() {
    const { name, description, price } = formInput;
    if (!name || !description || !price || !fileUrl) return; // redirect to the same place

    // passing the data into JSON format
    const data = JSON.stringify({
      name,
      description,
      image: fileUrl,
    });

    //* 1. Adding the img on IPFS
    try {
      const added = await client.add(data); // adding NFT data on infura IPFS

      const url = `https://nftmarket20.infura-ipfs.io/ipfs/${added.path}`;
      // creating the NFT and storing its url

      console.log("NFT url : " + url);
      createSale(url); // creating the sale for out nftMarketPlace
    } catch (error) {
      console.log("error uploading file:", error);
    }
  }

  async function createSale(url) {
    //* connecting with metamask wallet
    const web3Modal = new Web3Modal();
    const connection = await web3Modal.connect();
    const provider = new ethers.providers.Web3Provider(connection);

    //* getting account from metamask wallet
    const signer = provider.getSigner();

    //* connecting with NFT contract
    let contract = new ethers.Contract(nftaddress, NFT.abi, signer);
    let transaction = await contract.createToken(url); // creating NFT token uing tokenURI
    let tx = await transaction.wait(); // waiting for the transaction to happen as POS takes 12 seconds for a transaction

    // * dealing with the event
    let event = tx.events[0];
    let value = event.args[2];
    let tokenId = value.toNumber(); // getting the tokenId from the transaction event

    //* converting the NFT price into wei format
    const price = ethers.utils.parseUnits(formInput.price, "ether");
    console.log("price : " + price);

    //* connecting with NFTMarketAddress contract
    contract = new ethers.Contract(nftmarketaddress, NFTMarket.abi, signer);
    let listingPrice = await contract.getListingPrice(); // getting listing price the the NFT to list on the MarketPlace

    listingPrice = listingPrice.toString(); // converting into string

    //* listing a new NFT on the MarketPlace with the listing price
    transaction = await contract.createMarketItem(nftaddress, tokenId, price, {
      value: listingPrice,
    });
    await transaction.wait();
    router.push("/");
  }

  return (
    <div className="flex justify-center">
      <div className="w-1/2 flex flex-col pb-12">
        <input
          placeholder="NFT Name"
          className="mt-8 border rounded p-4 outline-none"
          onChange={(e) =>
            updateFormInput({ ...formInput, name: e.target.value })
          }
        />

        <textarea
          placeholder="NFT Description"
          className="mt-2 border rounded p-4 outline-none"
          onChange={(e) =>
            updateFormInput({ ...formInput, description: e.target.value })
          }
        />

        <input
          placeholder="NFT price in ETH"
          className="mt-2 border rounded p-4 outline-none"
          onChange={(e) =>
            updateFormInput({ ...formInput, price: e.target.value })
          }
        />

        <input type="file" name="asset" className="my-3" onChange={onChange} />

        {fileUrl && <img className="rounded mt-4" width="350" src={fileUrl} />}
        <button
          onClick={CreateMarket}
          className="font-bold mt-4 bg-gradient-to-r from-green-400 to-blue-500 hover:from-pink-500 hover:to-yellow-500 text-white rounded p-4 shadow-lg"
        >
          Create NFT
        </button>
      </div>
    </div>
  );
}
