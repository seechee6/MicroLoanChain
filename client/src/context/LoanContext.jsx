import * as anchor from '@project-serum/anchor'
import { useAnchorWallet, useConnection, useWallet } from '@solana/wallet-adapter-react'
import { PublicKey, SystemProgram } from "@solana/web3.js";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
} from "react";
import idl from "../idl/idl.json";
import { findProgramAddressSync } from '@project-serum/anchor/dist/cjs/utils/pubkey'
import { utf8 } from '@project-serum/anchor/dist/cjs/utils/bytes'

const PROGRAM_KEY = new PublicKey(idl.metadata.address);

const LoanContext = createContext();

export const useLoan = () => {
  const context = useContext(LoanContext);
  if (!context) {
    throw new Error("Parent must be wrapped inside PostsProvider");
  }

  return context;
};

export const LoanProvider = ({ children }) => {
  const [user, setUser] = useState();
  const [initialized, setInitialized] = useState(false);
  const [posts, setPosts] = useState([])
  const [transactionPending, setTransactionPending] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [lastPostId, setLastPostId] = useState()

  const anchorWallet = useAnchorWallet();
  const { connection } = useConnection();
  const { publicKey } = useWallet()

  const program = useMemo(() => {
    if (anchorWallet) {
      const provider = new anchor.AnchorProvider(connection, anchorWallet, anchor.AnchorProvider.defaultOptions())
      return new anchor.Program(idl, PROGRAM_KEY, provider)
    }
  }, [connection, anchorWallet])

  console.log(program)

  useEffect(() => {

    const start = async () => {
      if (program && publicKey) {
        try {
          const [userPda] = await findProgramAddressSync([utf8.encode('user'), publicKey.toBuffer()], program.programId)
          const user = await program.account.userAccount.fetch(userPda)
          if (user) {
            setInitialized(true)
          }
        } catch (error) {
          console.log(error)
          setInitialized(false)
        }
      }
    }

    start()

  }, [program, publicKey, transactionPending]);
  
  const initUser = async () => {
    if (program && publicKey) {
      try {
        setTransactionPending(true)
        const [userPda] = findProgramAddressSync([utf8.encode('user'), publicKey.toBuffer()], program.programId)
        const name = getRandomName();
        const avatar = getAvatarUrl(name);

        await program.methods
          .initUser(name, avatar)
          .accounts({
            userAccount: userPda,
            authority: publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc()
        setInitialized(true)
      } catch (error) {
        console.log(error)
      } finally {
        setTransactionPending(false)
      }
    }
  }
  return (
    <LoanContext.Provider
      value={{
      }}
    >
      {children}
    </LoanContext.Provider>
  );
};