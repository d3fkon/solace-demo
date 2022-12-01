import { PublicKey, SolaceV2 } from "solace-sdk";
import { Web3Auth } from "@web3auth/modal";
import { CHAIN_NAMESPACES } from "@web3auth/base";
import { SolanaWallet } from "@web3auth/solana-provider";
import { Connection, Keypair, Message, Transaction } from "@solana/web3.js";
import {
  Box,
  Button,
  Center,
  Flex,
  HStack,
  Text,
  useColorModeValue,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Input,
} from "@chakra-ui/react";
import bs58 from "bs58";
import { useState } from "react";

const clusterURL = "http://127.0.0.1:8899";

const privateKey = [
  64, 49, 21, 122, 173, 218, 147, 45, 207, 84, 138, 105, 6, 50, 18, 81, 174,
  246, 20, 171, 195, 135, 70, 222, 225, 154, 217, 74, 218, 186, 191, 197, 49,
  170, 69, 11, 200, 3, 223, 9, 39, 74, 201, 163, 68, 222, 53, 183, 52, 220, 243,
  79, 228, 240, 168, 172, 218, 155, 91, 56, 123, 136, 222, 143,
];

export interface RelayerIxData {
  message: string;
  signature?: string;
  publicKey?: string;
  blockHash: {
    lastValidBlockHeight: number;
    blockhash: string;
  };
}

/**
 * Relay a given transaction data on to the blockchain, while paying for gas

 */
export const relayTransaction = async (
  data: RelayerIxData,
  payer: Keypair,
  connection: Connection
) => {
  const transaction = Transaction.populate(
    Message.from(Buffer.from(data.message, "base64"))
  );
  if (data.publicKey && data.signature)
    transaction.addSignature(
      new PublicKey(data.publicKey),
      Buffer.from(bs58.decode(data.signature))
    );
  transaction.partialSign(payer);
  const serialized = transaction.serialize();
  const res = await connection.sendEncodedTransaction(
    serialized.toString("base64")
  );
  return res;
};

const connectWallet = async () => {
  const web3auth = new Web3Auth({
    chainConfig: {
      /*
         you can pass your own chain configs here
      */
      chainNamespace: CHAIN_NAMESPACES.SOLANA,
      chainId: "0x2", // Please use 0x1 for Mainnet, 0x2 for Testnet, 0x3 for Devnet
      rpcTarget: "http://127.0.0.1:8899",
      displayName: "solana",
      ticker: "SOL",
      tickerName: "solana",
    },
    clientId:
      "BGGT-O3dMjt82Jf04wV0o7TX5OTJemVpyEHhCdWD2ft3awUrJfMfs_dXG5tgxNuDm_F4muG3WcJzV-A7UvsYG74", // get from https://dashboard.web3auth.io
  });
  await web3auth.initModal();

  const provider = await web3auth.connect();
  const solanaWallet = new SolanaWallet(provider!);

  const sdk = new SolaceV2(solanaWallet, {
    rpcEndpoint: "http://127.0.0.1:8899",
    programId: "8FRYfiEcSPFuJd27jkKaPBwFCiXDFYrnfwqgH9JFjS2U",
  });
  setTimeout(async () => {
    const tx = await sdk.createWallet(
      "Name5",
      new PublicKey("4LsZkGUwZax7x3qdNubwb9czWk2TJNysrVjzc2pGF91p")
    );
    console.log(tx);

    const connection = new Connection(clusterURL);

    const wallet = Keypair.fromSecretKey(Uint8Array.from(privateKey));
    const sig = await relayTransaction(tx, wallet, connection);
    const confirmation = await connection.confirmTransaction(sig);
    console.log({ sig, confirmation });
    console.log({ "Solace Wallet SDK": sdk.solaceWalletPublicKey.toString() });
  }, 5000);
};

export default function Home() {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [username, setUsername] = useState("");

  return (
    <>
      <Box
        height="100vh"
        backgroundImage="url('https://uploads-ssl.webflow.com/6311db704c17c1859b3982e9/6311df3b4c17c1016039b02b_Lines.svg')"
      >
        <Box as="section" backgroundColor={"black"}>
          <Box
            as="nav"
            bg="bg-surface"
            boxShadow={useColorModeValue("sm", "sm-dark")}
          >
            <Box py={{ base: "4", lg: "5" }} mx={10}>
              <HStack spacing="10" justify="flex-end"></HStack>

              <Flex justify="space-between" flex="1">
                <Box>
                  <Text as="samp" fontSize={"2xl"} fontWeight="black">
                    Solace Wallet SDK
                  </Text>
                </Box>
                <HStack spacing="3">
                  <Button colorScheme={"orange"} onClick={onOpen}>
                    Connect your Wallet
                  </Button>
                </HStack>
              </Flex>
            </Box>
          </Box>
        </Box>
        <Box mt="30vh">
          <Center>
            <Text
              fontSize={"4xl"}
              fontWeight="light"
              bg="blackAlpha.400"
              borderRadius={"2xl"}
              p="4"
            >
              Client dApp content
            </Text>
          </Center>
        </Box>

        <Modal isOpen={isOpen} onClose={onClose}>
          <ModalOverlay bg="blackAlpha.300" backdropFilter="blur(2px)" />
          <ModalContent mt="10">
            <ModalHeader>Enter your username</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <Input
                variant="filled"
                placeholder="username..."
                onChange={(e) => setUsername(e.target.value)}
                _focus={{ borderColor: "orange.200" }}
              />
            </ModalBody>

            <ModalFooter>
              <Button
                colorScheme={"orange"}
                size="sm"
                disabled={username === ""}
              >
                Connect
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </Box>
    </>
  );
}
