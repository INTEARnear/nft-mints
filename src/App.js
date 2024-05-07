import "./App.css";
import { useEffect, useState } from "react";
import NftToken from "./NftToken";

let globalIndex = 0;

const nftMintFilter = {};
const nftTransferFilter = {};

let reconnectTimeouts = {};

function listenToNFT(processEvent, url, filter) {
  const scheduleReconnect = (timeOut, url, filter) => {
    if (reconnectTimeouts[url]) {
      clearTimeout(reconnectTimeouts[url]);
      reconnectTimeouts[url] = null;
    }
    reconnectTimeouts[url] = setTimeout(() => {
      listenToNFT(processEvent, url, filter);
    }, timeOut);
  };

  if (document.hidden) {
    scheduleReconnect(1000);
    return;
  }

  const ws = new WebSocket(url);

  ws.onopen = () => {
    console.log(`Connection to WS has been established`);
    ws.send(
      JSON.stringify(filter)
    );
  };
  ws.onclose = () => {
    console.log(`WS Connection has been closed`);
    scheduleReconnect(1, url, filter);
  };
  ws.onmessage = (e) => {
    const data = JSON.parse(e.data);
    processEvent(data);
  };
  ws.onerror = (err) => {
    console.log("WebSocket error", err);
  };
}

async function fetchEvents(url) {
  const res = await fetch(url);
  try {
    const response = await res.json();
    return response;
  } catch (e) {
    console.log(e);
    return [];
  }
}

function unzipEvents(event) {
  return event.token_ids.map((tokenId) => ({
    time: new Date(event.block_timestamp_nanosec / 1_000_000),
    contractId: event.contract_id,
    oldOwnerId: event.old_owner_id,
    newOwnerId: event.new_owner_id,
    ownerId: event.owner_id,
    tokenId,
    isTransfer: event.owner_id === undefined,
    index: globalIndex++,
  }));
}

function App() {
  const [nfts, setNfts] = useState([]);

  // Setting up NFTs
  useEffect(() => {
    const processEvent = (event) => {
      let events = unzipEvents(event);
      events.reverse();
      setNfts((prevState) => {
        const newNfts = [
          ...events,
          ...prevState,
        ];
        return newNfts.slice(0, 100);
      });
    };

    for (const [name, filter] of [["nft_mint", nftMintFilter], ["nft_transfer", nftTransferFilter]]) {
      fetchEvents(`https://events.intear.tech/v0/nft/${name}?start_block_timestamp_nanosec=${(Date.now() - 1000 * 60 * 5) * 1_000_000}&blocks=50`).then(events => events.forEach(processEvent));
      listenToNFT(processEvent, `wss://ws-events.intear.tech/v0/nft/${name}`, filter);
    }
  }, []);

  return (
    <div>
      <h1>Live NFT feed</h1>
      <div className="card-wrapper">
        {nfts.map((nft) => {
          return (
            <NftToken key={`${nft.index}`} nft={nft} />
          );
        })}
      </div>
    </div>
  );
}

export default App;
