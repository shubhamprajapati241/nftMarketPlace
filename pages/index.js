import { ethers } from "ethers";
import { useEffect, useState } from "react";
import axios, { HttpStatusCode } from "axios";
import Web3Modal from "web3modal";
import { nftaddress, nftmarketaddress } from "../config";

//const ipfsClient = require('ipfs-http-client');

import NFT from "../artifacts/contracts/NFT.sol/NFT.json";
import NFTMarket from "../artifacts/contracts/NFTMarket.sol/NFTMarket.json";

export default function Home() {
  const [nfts, setNFts] = useState([]);
  const [loadingState, setLoadingState] = useState("not-loaded");

  useEffect(() => {
    loadNFTs();
  }, []);

  async function loadNFTs() {
    const provider = new ethers.providers.JsonRpcProvider();
    const nftContract = new ethers.Contract(nftaddress, NFT.abi, provider);
    const nftMarketContract = new ethers.Contract(
      nftmarketaddress,
      NFTMarket.abi,
      provider
    );
    const data = await nftMarketContract.fetchMarketItems();

    const items = await Promise.all(
      data.map(async (i) => {
        const tokenUri = await nftContract.tokenURI(i.tokenId);
        const meta = await axios.get(tokenUri);
        let price = ethers.utils.formatUnits(i.price.toString(), "ether");
        let item = {
          price,
          tokenId: i.tokenId.toNumber(),
          seller: i.seller,
          owner: i.owner,
          image: meta.data.image,
          name: meta.data.name,
          description: meta.data.description,
        };
        console.log(meta);
        return item;
      })
    );
    setNFts(items);
    setLoadingState("loaded");
  }

  async function buyNFT(nft) {
    const web3Modal = new Web3Modal();
    const connection = await web3Modal.connect();
    const provider = new ethers.providers.Web3Provider(connection);

    const signer = provider.getSigner();
    const contract = new ethers.Contract(
      nftmarketaddress,
      NFTMarket.abi,
      signer
    );
    const price = ethers.utils.parseUnits(nft.price.toString(), "ether");
    const transaction = await contract.createMarketSale(
      nftaddress,
      nft.tokenId,
      {
        value: price,
      }
    );
    await transaction.wait();
    loadNFTs();
  }

  if (loadingState === "loaded" && !nfts.length)
    return (
      <div>
        <p className="px-10 py-10 text-2xl font-bold flex justify-center text-cyan-200">
          There are currently no NFTs in the Marketplace.
          <br /> Please come back later
        </p>
      </div>
    );

  return (
    <div className="flex justify-center">
      <div className="container mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 pt-5">
          {nfts.map((nft, i) => (
            <div
              key={i}
              className="border shadow rounded-3xl overflow-hidden text-center bg-white"
            >
              <img src={nft.image} className="h-72 w-full object-cover" />
              <div className="p-4">
                <p style={{}} className="text-2xl font-bold">
                  {nft.name}
                </p>
                <div style={{ overflow: "hidden" }}>
                  <p className="text-gray-700 text-xl pt-3">
                    {nft.description}
                  </p>
                </div>
                <p className="text-2xl pt-3 font-bold text-black">
                  {nft.price} ETH
                </p>
              </div>

              <div className="p-4 bg-blue">
                <button
                  className="w-full bg-purple-600 text-white font-bold py-2 px-12 rounded"
                  onClick={() => buyNFT(nft)}
                >
                  Buy
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
