import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { HalfCircleBackground } from '../components';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { toast } from 'react-hot-toast';
import { fundLoan } from '../utils/solanaLoanUtils';
import phantomLogo from "../../images/phantom-logo.png";
import { PublicKey } from '@solana/web3.js';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

// Import adapter styles for proper wallet button styling
import '@solana/wallet-adapter-react-ui/styles.css';

const FundingReviewPage = () => {
  const { loanId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();
  const wallet = useWallet(); // Get the full wallet object with signing methods
  
  const [loan, setLoan] = useState(null);
  const [loadingLoan, setLoadingLoan] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transactionError, setTransactionError] = useState(null);
  const [isBlockchainLoan, setIsBlockchainLoan] = useState(false);
  const [loanPublicKey, setLoanPublicKey] = useState(null);
  const [borrowerPublicKey, setBorrowerPublicKey] = useState(null);

  useEffect(() => {
    // Get loan data from location state or fetch it
    const fetchLoanDetails = async () => {
      setLoadingLoan(true);
      try {
        if (location.state && location.state.loan) {
          // Use the loan data passed via navigation
          setLoan(location.state.loan);
          
          // Check if this is a blockchain loan
          if (location.state.isBlockchainLoan) {
            setIsBlockchainLoan(true);
            setLoanPublicKey(location.state.loanPublicKey);
            setBorrowerPublicKey(location.state.borrowerPublicKey);
            
            console.log('Blockchain loan details loaded:', {
              loanPublicKey: location.state.loanPublicKey,
              borrowerPublicKey: location.state.borrowerPublicKey,
              loan: location.state.loan
            });
          }
          
          setLoadingLoan(false);
        } else {
          // In a real app, this would fetch loan data from your API/blockchain
          // Simulate fetching data for the selected loan ID
          setTimeout(() => {
            // Mock loan details for demonstration
            const mockLoan = {
              id: loanId,
              title: 'Small Business Loan',
              borrower: '0x7e...1A3b',
              requestDate: 'Mar 19, 2024',
              requestedAmount: '45,000',
              monthlyPayment: '5,000',
              purpose: 'Business Expansion',
              proposedInterest: '8.5%',
              term: '12 months',
              risk: 'low',
              collateralOffered: 'Business Equipment',
              creditScore: '720',
              status: 'pending',
              loanId: `LOAN-${loanId}`,
            };
            
            setLoan(mockLoan);
            setLoadingLoan(false);
          }, 1000);
        }
      } catch (error) {
        console.error("Error fetching loan details:", error);
        toast.error("Failed to load loan details");
        setLoadingLoan(false);
      }
    };

    fetchLoanDetails();
  }, [loanId, location]);

  useEffect(() => {
    // Check wallet connection status on component mount and whenever it changes
    if (connected && publicKey) {
      console.log('Wallet connected in component:', publicKey.toString());
    } else {
      console.log('Wallet not connected in component');
    }
  }, [connected, publicKey]);

  const handleFundNow = async () => {
    if (!connected) {
      toast.error("Please connect your wallet first");
      // Show wallet modal if not connected
      document.querySelector('.wallet-adapter-button')?.click();
      return;
    }
    
    console.log('Starting funding process...');
    console.log('Wallet connected:', connected);
    console.log('Wallet public key:', publicKey?.toString());
    console.log('Blockchain loan:', isBlockchainLoan);
    console.log('Loan Public Key:', loanPublicKey);
    
    if (isBlockchainLoan && !loanPublicKey) {
      toast.error("Missing loan information. Please try again from the loan listing page.");
      return;
    }
    
    setTransactionError(null);
    setIsProcessing(true);
    
    try {
      let signature = '';
      
      if (isBlockchainLoan) {
        // For blockchain loans, use fundLoan from our utilities
        const loadingToast = toast.loading("Processing blockchain transaction...");
        
        console.log('Funding blockchain loan with:', {
          connection: connection ? 'Connected' : 'Not connected',
          wallet: wallet ? 'Connected' : 'Not connected',
          walletPublicKey: wallet.publicKey?.toString(),
          loanPublicKey: loanPublicKey,
        });
        
        if (!loanPublicKey) {
          throw new Error("Loan public key is missing");
        }
        
        // Ensure loanPublicKey is a PublicKey object
        const loanPubKey = typeof loanPublicKey === 'string' 
          ? new PublicKey(loanPublicKey)
          : loanPublicKey;
          
        // Verify that loanPubKey is now a valid public key
        if (!(loanPubKey instanceof PublicKey)) {
          throw new Error("Invalid loan public key format");
        }
        
        // Pass the complete wallet object as provided by useWallet()
        const result = await fundLoan(
          connection, 
          wallet, // Use the full wallet object from useWallet()
          loanPubKey
        );
        
        toast.dismiss(loadingToast);
        
        if (result.success) {
          toast.success("Loan funded successfully on blockchain!");
          signature = result.signature;
        } else {
          throw new Error(result.message || "Transaction failed");
        }
      } else {
        // For mock loans, use the old method or simulate
        toast.loading("Processing transaction...");
        
        // Simulate a transaction
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        signature = 'mock-tx-' + Math.random().toString(36).substring(2, 10);
        
        toast.dismiss();
        toast.success("Loan funded successfully!");
      }
      
      // Navigate to success page with loan data
      navigate(`/funding-success/${loanId}`, { 
        state: { 
          loan: {
            ...loan,
            funded: true,
            fundingDate: new Date().toLocaleDateString('en-US', {
              month: 'short', 
              day: 'numeric', 
              year: 'numeric'
            }),
            transactionSignature: signature,
            isBlockchainLoan,
            loanPublicKey
          },
          isLender: true
        } 
      });
    } catch (error) {
      console.error("Error funding loan:", error);
      toast.dismiss();
      toast.error(`Transaction failed: ${error.message}`);
      setTransactionError(
        error.message || "Transaction failed. Please try again."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  if (loadingLoan || !loan) {
    return (
      <HalfCircleBackground title="Funding Review">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-secondary"></div>
        </div>
      </HalfCircleBackground>
    );
  }

  // Get shortened wallet address for display
  const shortenAddress = (address) => {
    if (!address) return '';
    return `${address.toString().slice(0, 4)}...${address.toString().slice(-4)}`;
  };

  const renderPaymentMethod = () => (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
          <img 
            src={phantomLogo} 
            alt="Phantom"
            className="w-10 h-10 object-contain"
          />
        <div>
          <p className="font-medium text-gray-800">Phantom Wallet</p>
          <p className="text-gray-500 text-sm">{shortenAddress(publicKey)}</p>
        </div>
      </div>
      <button className="text-secondary font-medium hover:text-secondaryLight transition-colors">
        Change
      </button>
    </div>
  );

  return (
    <HalfCircleBackground title="Funding Review">
      <div className="max-w-lg mx-auto pt-1 w-full pb-8 px-4 sm:px-0">
        {/* Blockchain indicator for blockchain loans */}
        {isBlockchainLoan && (
          <div className="mb-4 bg-blue-100 text-blue-800 px-4 py-3 rounded-lg flex items-center">
            <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="text-sm">
              This transaction will be recorded on the Solana blockchain
            </span>
          </div>
        )}
      
        {/* Wallet connection reminder */}
        {!connected && (
          <div className="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-100">
            <p className="text-yellow-800 mb-3">Connect your wallet to fund this loan</p>
            <WalletMultiButton className="w-full flex justify-center" />
          </div>
        )}
        
        {/* Loan Amount Card */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden mb-6">
          <div className="p-6">
            <div className="mb-5">
              <h2 className="text-3xl font-bold text-gray-800">
                {isBlockchainLoan 
                  ? `${loan.solAmount} SOL` 
                  : `RM ${loan.requestedAmount || loan.amount}`}
              </h2>
              <div className="flex items-center mt-1">
                <p className="text-gray-500 text-sm">
                  {isBlockchainLoan ? 'Blockchain ID:' : 'Loan ID:'} {isBlockchainLoan ? (loanPublicKey?.substring(0, 8) + '...') : loan.id}
                </p>
                <button 
                  className="ml-2 text-secondary hover:text-secondaryLight transition-colors"
                  aria-label="Copy loan ID"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4">
              <button 
                onClick={toggleExpanded}
                className="flex justify-between items-center w-full text-left mb-3 hover:bg-gray-50 p-2 rounded-lg transition-colors"
                aria-expanded={isExpanded}
                aria-controls="loan-details"
              >
                <p className="font-medium text-gray-800">{loan.title}</p>
                <div className="flex items-center">
                  <span className="text-secondary font-semibold mr-1">{loan.proposedInterest}</span>
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className={`h-5 w-5 text-secondary transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {isExpanded && (
                <div id="loan-details" className="space-y-3 mb-4 bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between">
                    <p className="text-gray-600">Payment Term</p>
                    <p className="font-medium">{loan.term}</p>
                  </div>
                  <div className="flex justify-between">
                    <p className="text-gray-600">Monthly Payment</p>
                    <p className="font-medium">
                      {isBlockchainLoan
                        ? `${(loan.solAmount / parseInt(loan.duration)).toFixed(4)} SOL`
                        : `RM ${loan.monthlyPayment || Math.round(parseFloat(loan.amount || 0) / parseInt(loan.duration || 1))}`}
                    </p>
                  </div>
                  <div className="flex justify-between">
                    <p className="text-gray-600">Purpose</p>
                    <p className="font-medium">{loan.purpose || loan.description || 'Not specified'}</p>
                  </div>
                  {loan.risk && (
                    <div className="flex justify-between">
                      <p className="text-gray-600">Risk Level</p>
                      <p className="font-medium">
                        {loan.risk === 'low' ? 'Low Risk' : loan.risk === 'medium' ? 'Medium Risk' : 'High Risk'}
                      </p>
                    </div>
                  )}
                  {loan.creditScore && (
                    <div className="flex justify-between">
                      <p className="text-gray-600">Credit Score</p>
                      <p className="font-medium">{loan.creditScore}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Payment Method Section */}
        <div className="mb-6">
          <h3 className="text-gray-700 font-medium mb-3">Selected Payment Method</h3>
          <div className="bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow">
            {renderPaymentMethod()}
          </div>
        </div>

        {/* Funding Terms */}
        <div className="mb-6 bg-yellow-50 rounded-xl p-4 border border-yellow-100">
          <h3 className="text-yellow-800 font-medium mb-2">Funding Terms</h3>
          <p className="text-yellow-700 text-sm mb-2">
            By funding this loan, you agree to:
          </p>
          <ul className="text-yellow-700 text-sm space-y-2 mb-3 pl-1">
            <li className="flex items-start">
              <span className="mr-1">•</span>
              <span>Transfer {isBlockchainLoan 
                ? `${loan.solAmount} SOL` 
                : `RM ${loan.requestedAmount || loan.amount}`} to the borrower</span>
            </li>
            <li className="flex items-start">
              <span className="mr-1">•</span>
              <span>Accept the proposed interest rate of {loan.proposedInterest}</span>
            </li>
            <li className="flex items-start">
              <span className="mr-1">•</span>
              <span>Receive monthly payments of {isBlockchainLoan
                ? `${(loan.solAmount / parseInt(loan.duration)).toFixed(4)} SOL`
                : `RM ${loan.monthlyPayment || Math.round(parseFloat(loan.amount || 0) / parseInt(loan.duration || 1))}`} for {loan.term}</span>
            </li>
          </ul>
          <p className="text-yellow-700 text-sm">
            {isBlockchainLoan 
              ? "This transaction will be permanently recorded on the Solana blockchain and cannot be reversed."
              : "This transaction cannot be reversed once confirmed."}
          </p>
        </div>

        {/* Lender Protection Fee Notice */}
        <div className="mb-6 bg-blue-50 rounded-xl p-4 border border-blue-100">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div>
              <h3 className="text-blue-700 font-medium mb-1">Lender Protection Notice</h3>
              <p className="text-blue-600 text-sm">
                A 5% protection fee will be automatically deducted from the loan amount before borrowers receive the funds. This fee is held in reserve to protect you in case of default.
              </p>
            </div>
          </div>
        </div>

        {/* Fund Now Button */}
        {isProcessing ? (
          <div className="w-full bg-secondary py-4 rounded-xl font-medium text-lg text-center text-white flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
            Processing Transaction...
          </div>
        ) : (
          <button 
            onClick={handleFundNow}
            disabled={!connected}
            className={`w-full py-4 rounded-xl font-medium text-lg transition-colors ${
              connected 
                ? "bg-secondary hover:bg-secondaryLight text-white" 
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            {connected ? `Fund Now - ${isBlockchainLoan 
              ? `${loan.solAmount} SOL` 
              : `RM ${loan.requestedAmount || loan.amount}`}` : "Connect Wallet to Fund"}
          </button>
        )}
        
        {transactionError && (
          <div className="mt-2 text-red-500 text-center">
            {transactionError}
          </div>
        )}

        {/* Back Button */}
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center text-blue-700 font-medium mt-5 hover:text-blue-900 transition-colors"
          aria-label="Back to loan details"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Loan Details
        </button>
      </div>
    </HalfCircleBackground>
  );
};

export default FundingReviewPage;