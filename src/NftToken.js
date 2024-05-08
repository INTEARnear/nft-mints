import React, { useEffect, useState } from "react";
import { useNear } from "./data/near";
import {accountTrim, isObject, keysToCamel} from "./data/utils";

const metadataCache = {};

async function fetchNftData(near, nft) {
  try {
    const nftMetadata = await (nft.contractId in metadataCache
      ? metadataCache[nft.contractId]
      : (metadataCache[nft.contractId] = near
          .viewCall(nft.contractId, "nft_metadata", {})
          .then(keysToCamel)));

    const nftToken = keysToCamel(
      await near.viewCall(nft.contractId, "nft_token", {
        token_id: nft.tokenId,
      })
    );

    const ownerId = (isObject(nftToken.ownerId) && "Account" in nftToken.ownerId) ? nftToken.ownerId["Account"] : nftToken.ownerId;

    let tokenMetadata = nftToken?.metadata;
    let tokenMedia = tokenMetadata?.media || "";

    let imageUrl =
      tokenMedia.startsWith("https://") ||
      tokenMedia.startsWith("http://") ||
      tokenMedia.startsWith("data:image")
        ? tokenMedia
        : nftMetadata.baseUri
          ? `${nftMetadata.baseUri}/${tokenMedia}`
          : tokenMedia.startsWith("Qm")
            ? `https://cloudflare-ipfs.com/ipfs/${tokenMedia}`
            : tokenMedia;

    let parasUrl = `https://paras.id/token/${nft.contractId}/${nft.tokenId}`;
    let mintbaseUrl = `https://www.mintbase.xyz/contract/${nft.contractId}/nfts/all/0`;
    let parasOwnerUrl = `https://paras.id/${ownerId}/collectibles`;
    let parasCollectionUrl = `https://paras.id/collection/${nft.contractId}`;
    let tradeportUrl = `https://www.tradeport.xyz/near/collection/${nft.contractId}?tokenId=${nft.tokenId}`

    let ownerUrl = parasOwnerUrl;
    let storeUrl = parasCollectionUrl;
    let tokenUrl = parasUrl;

    let title = tokenMetadata?.title;
    let description = tokenMetadata.description || nftMetadata.name;

    if (tokenMetadata.reference) {
      const components = tokenMetadata.reference.split('/');
      tokenUrl = `https://mintbase.io/thing/${components[components.length - 1]}:${nft.contractId}`;
      mintbaseUrl = tokenUrl;
    }


    return {
      title,
      description,
      ownerId,
      contractId: nft.contractId,
      parasOwnerUrl,
      parasCollectionUrl,
      imageUrl,
      parasUrl,
      mintbaseUrl,
      tradeportUrl,
      tokenUrl,
      ownerUrl,
      storeUrl,
      nft,
      nftToken,
      nftMetadata,
    };
  } catch (e) {
    console.error(e);
    return null;
  }
}

export default function NftToken(props) {
  const [nftData, setNftData] = useState(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const near = useNear();
  const nft = props.nft;

  useEffect(() => {
    if (near && nft) {
      fetchNftData(near, nft).then(setNftData);
    }
  }, [near, nft]);

  return nftData ? (
    <div className={`card ${nftData.nft.isTransfer ? "transfer" : "mint"}`}>
      <div className="card__head">
        <a target="_blank" rel="noreferrer" href={nftData.imageUrl}>
          <div className={`card__product-img${!imgLoaded ? " loading" : ""}`}>
            <img src={nftData.imageUrl} alt={nftData.title} onLoad={() => imgLoaded || setImgLoaded(true)}/>
          </div>
        </a>
      </div>

      <div className="card__body">
        <a target="_blank" rel="noreferrer" href={nftData.tokenUrl}>
          <h3 className="card__title">{nftData.title}</h3>
        </a>

        <p className="card__text">{nftData.description}</p>

        <div className="wrapper">
          <div className="card__owner">
            <a target="_blank" rel="noreferrer" href={nftData.ownerUrl}>
              {accountTrim(nftData.ownerId)}
            </a>
          </div>

          <div className="card__contract">
            <a
              target="_blank"
              rel="noreferrer"
              href={nftData.storeUrl}
            >
              {accountTrim(nftData.contractId)}
            </a>
          </div>
        </div>
      </div>
      <div className="card__footer">
        <a target="_blank" rel="noreferrer" href={nftData.mintbaseUrl + '?affiliateAccount=slimedragon.near'}>
          Mintbase
        </a>
        <a target="_blank" rel="noreferrer" href={nftData.tradeportUrl}>
          Tradeport
        </a>
        <a target="_blank" rel="noreferrer" href={nftData.parasUrl}>
          Paras
        </a>
      </div>
    </div>
  ) : (
    <div>Loading</div>
  );
}
