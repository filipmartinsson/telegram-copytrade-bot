import express from "express"
import bodyParser from "body-parser"
import Moralis from "moralis"
import axios from "axios"

const app = express();
app.use(bodyParser.json());
const port = 3000;

const moralisAPIKey = "";
const TELEGRAM_BOT_TOKEN = '';
const CHANNEL_CHAT_ID = '';

await Moralis.start({apiKey: moralisAPIKey})

app.post("/webhook", async (req, res) => {
    const webhookBody = req.body;
    res.status(200).send();
    if(webhookBody.logs.length > 0){
        const decodedLogs = Moralis.Streams.parsedLogs(webhookBody);
        const addresses = getInvolvedAddresses(webhookBody.logs);
        const fromData = getFromData(webhookBody.erc20Transfers, addresses);
        const toData = getToData(webhookBody.erc20Transfers, addresses);
        addresses.forEach(address => {
            checkAndSendSwapHook(address, fromData[address], toData[address]);
        });
    }
    

})

function checkAndSendSwapHook(address, fromData, toData){
    console.log(fromData);
    console.log(toData);
    if(fromData.length === 1 && fromData[0].tokenName && fromData[0].value && fromData[0].to !== null && fromData[0].to !== "0x0000000000000000000000000000000000000000" 
        && toData.length === 1 && toData[0].tokenName && toData[0].tokenName && toData[0].from !== null && toData[0].from !== "0x0000000000000000000000000000000000000000"
    )
        sendHook(address, fromData[0], toData[0])
}

async function sendHook(address, fromTransfer, toTransfer){
    const message = `🐋🐋🐋 Whale alert for (${shortenAddress(address)}) \n \n 🔥 Swapped ${fromTransfer.valueWithDecimals} ${fromTransfer.tokenSymbol} to ${toTransfer.valueWithDecimals} ${toTransfer.tokenSymbol}`
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const payload = {
        chat_id: CHANNEL_CHAT_ID,
        text: message,
    };

    try {
        const response = await axios.post(url, payload);
        console.log('Message sent:', response.data);
    } catch (error) {
        console.error('Error sending message:', error);
    }

}

function getInvolvedAddresses(logs){
    const addresses = logs.reduce((acc, log) => {
        if (log.triggered_by) {
        acc.push(...log.triggered_by);
        }
        return acc;
    }, []);
    // Use a Set to ensure all addresses are unique
    return [...new Set(addresses)];
}

function getFromData(transfers, addresses){
    const results = {};
    addresses.forEach(address => {
      results[address.toLowerCase()] = transfers.filter(
        transfer => transfer.from.toLowerCase() === address.toLowerCase()
      );
    });
    return results;
}

function getToData(transfers, addresses){
    const results = {};
    addresses.forEach(address => {
      results[address.toLowerCase()] = transfers.filter(
        transfer => transfer.to.toLowerCase() === address.toLowerCase()
      );
    });
    return results;
}

const shortenAddress = (address) => {
    if (typeof address !== 'string' || !address.startsWith('0x') || address.length !== 42) {
      throw new Error('Invalid Ethereum address');
    }
    const start = address.substring(0, 6);
    const end = address.substring(address.length - 4);
    return `${start}...${end}`;
  };

app.listen(port, () => {
    console.log("Server started listening to port", port)
})