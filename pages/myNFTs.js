import { ethers } from "ethers";
import Web3Modal from "web3modal";
import { useEffect, useState } from "react";
import axios from "axios";
import styles from "../styles/Home.module.css";

import { nftaddress, nftmarketaddress } from "../config";

import NFT from "../artifacts/contracts/NFT.sol/NFT.json";
import NFTMarket from "../artifacts/contracts/NFTMarket.sol/NFTMarket.json";

export default function MyAssets() {
  const [nfts, setNfts] = useState([]);
  const [loadingState, setLoadingState] = useState(false);
  useEffect(() => {
    loadNFTs();
  }, []);

  async function loadNFTs() {
    //* 1 Connect with metamask usng web3modal
    const web3Modal = new Web3Modal();
    const connection = await web3Modal.connect();
    const provider = new ethers.providers.Web3Provider(connection);

    //* 2. Get accounts from metamask wallet
    const signer = provider.getSigner();

    //* 3. Initialize the NFT market contract
    const marketContract = new ethers.Contract(
      nftmarketaddress,
      NFTMarket.abi,
      signer
    );

    //* 4. Initialize the NFT contract
    const tokenContract = new ethers.Contract(nftaddress, NFT.abi, provider);

    //* 5. Fetch the msg.sender NFTs from the nftMarketPlace contract
    const data = await marketContract.fetchMyNFTs();

    //* 6. Iterating thorugh data and getting NFT image for all the NFTs
    const items = await Promise.all(
      data.map(async (i) => {
        const tokenUri = await tokenContract.tokenURI(i.tokenId); // getting the NFT tokenURI for the image
        const meta = await axios.get(tokenUri); // connecting with uri with axois
        let price = ethers.utils.formatUnits(i.price.toString(), "ether"); // converting wei -> ether
        let item = {
          price,
          tokenId: i.tokenId.toNumber(),
          seller: i.seller,
          owner: i.owner,
          name: meta.data.name,
          image: meta.data.image,
        };
        return item;
      })
    );

    setNfts(items); // setting into nft hook
    setLoadingState(true);
  }
  if (loadingState === true && !nfts.length)
    return <h1 className="py-10 px-20 text-3xl">No assets owned</h1>;
  return (
    <div className="flex justify-center">
      <div className="p-4">
        <div className="grid grid-cols-4 gap-5 pt-6">
          {nfts.map((nft, i) => (
            <div key={i} className="border shadow rounded-xl overflow-hidden">
              <img className="h-72 w-full object-cover" src={nft.image} />
              <div className="p-4 bg-white text-black text-center">
                <p className="text-xl font-bold">{nft.name}</p>
                <p className="text-xl font-semibold ">{nft.price} Eth</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
