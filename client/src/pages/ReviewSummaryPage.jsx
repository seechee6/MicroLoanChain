import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { HalfCircleBackground } from '../components';
import { getLoanById, getUserPhoneNumber } from '../services/databaseService';
import { sendPaymentConfirmation } from '../services/smsService';
import { TransactionContext } from '../context/TransactionContext';
import { toast } from 'react-hot-toast';

// ChevronDownIcon component
const ChevronDownIcon = ({ className = "h-5 w-5" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

const ReviewSummaryPage = () => {
  const { loanId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentAccount } = useContext(TransactionContext);
  const [loanDetails, setLoanDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');

  useEffect(() => {
    // Fetch loan details from our database service
    const fetchLoanDetails = async () => {
      setIsLoading(true);
      try {
        // In production, handle the "all" case separately for bulk payments
        const loanIdToFetch = loanId === 'all' ? '1' : loanId;
        const loan = await getLoanById(loanIdToFetch);
        
        if (loan) {
          const nextPaymentDate = new Date(loan.nextPaymentDate);
          // Calculate next payment date by adding one month to current payment date
          const nextMonth = nextPaymentDate.getMonth() + 1;
          const nextYear = nextPaymentDate.getMonth() === 11 
            ? nextPaymentDate.getFullYear() + 1 
            : nextPaymentDate.getFullYear();
          
          const nextDueDate = new Date(nextYear, nextMonth % 12, nextPaymentDate.getDate());
          
          setLoanDetails({
            id: loan.id,
            amount: loan.paymentAmount,
            repaymentDate: nextPaymentDate.toLocaleDateString('en-US', {
              month: 'short', 
              day: 'numeric', 
              year: 'numeric'
            }),
            nextDueDate: nextDueDate.toLocaleDateString('en-US', {
              month: 'short', 
              day: 'numeric', 
              year: 'numeric'
            }),
            loanId: loan.loanId,
            period: loan.period,
            totalAmount: loan.paymentAmount,
            principal: loan.principal,
            interest: loan.interestAmount,
            borrowerId: loan.borrowerId,
            smsRemindersEnabled: loan.smsRemindersEnabled || false,
            monthlyPayment: loan.paymentAmount,
            term: loan.term || '12 months'
          });
          
          // Fetch the user's phone number if available
          if (loan.borrowerId) {
            const phone = await getUserPhoneNumber(loan.borrowerId);
            setPhoneNumber(phone);
          }
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching loan details:", error);
        setIsLoading(false);
      }
    };

    fetchLoanDetails();
  }, [loanId]);

  const handlePayNow = async () => {
    try {
      setIsProcessing(true);
      
      // Simulate blockchain transaction
      toast.loading("Processing payment transaction...");
      
      // In a real app, this would initiate a payment transaction using Metamask or blockchain
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.dismiss();
      toast.success("Payment successful!");
      
      // Send SMS confirmation if phone number is available and SMS reminders are enabled
      if (phoneNumber && loanDetails.smsRemindersEnabled) {
        const paymentDetails = {
          amount: loanDetails.amount,
          nextDueDate: loanDetails.nextDueDate
        };
        
        // Send payment confirmation SMS
        const smsResult = await sendPaymentConfirmation(phoneNumber, paymentDetails);
        
        if (smsResult.success) {
          console.log("Payment confirmation SMS sent successfully");
        } else {
          console.error("Failed to send payment confirmation SMS:", smsResult.error);
        }
      }
      
      // Navigate to success page or back to home after payment
      navigate('/', { 
        state: { 
          paymentSuccess: true,
          loanId: loanDetails.id,
          amount: loanDetails.amount
        } 
      });
    } catch (error) {
      console.error("Payment error:", error);
      toast.dismiss();
      toast.error("Payment failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  if (isLoading || !loanDetails) {
    return (
      <HalfCircleBackground title="Review Summary">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
        </div>
      </HalfCircleBackground>
    );
  }

  // Get shortened wallet address for display
  const shortenAddress = (address) => {
    return address 
      ? `${address.substring(0, 4)}...${address.substring(address.length - 4)}`
      : '0x00...0000';
  };

  return (
    <HalfCircleBackground title="Review Summary">
      <div className="max-w-lg mx-auto pt-1 w-full pb-8">
        {/* Loan Amount Card */}
        <div className="bg-white p-5 rounded-lg shadow-sm mb-5">
          <div className="flex items-center mb-2">
            <span className="text-gray-600">Total Amount</span>
          </div>
          <h2 className="text-3xl font-bold text-gray-800">RM {loanDetails.amount}</h2>
          <p className="text-gray-500 text-sm mt-1">Monthly Payment: RM{loanDetails.monthlyPayment} for {loanDetails.term}</p>
        </div>

        {/* Loan Details Card */}
        <div className="w-full bg-white p-5 rounded-lg shadow-sm mb-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Loan Details</h3>
            <span 
              className="text-gray-600 flex items-center cursor-pointer"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              <span className="text-green-500 font-semibold mr-1">RM {loanDetails.totalAmount}</span>
              <ChevronDownIcon 
                className={`h-5 w-5 text-green-500 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              />
            </span>
          </div>

          {isExpanded && (
            <div className="space-y-4 mt-4 pt-4 border-t border-gray-100">
              <div className="flex justify-between">
                <p className="text-gray-600">Principal</p>
                <p className="font-medium">RM {loanDetails.principal}</p>
              </div>
              <div className="flex justify-between">
                <p className="text-gray-600">Interest</p>
                <p className="font-medium">RM {loanDetails.interest}</p>
              </div>
            </div>
          )}
        </div>

        {/* Payment Method Section */}
        <div className="mb-6">
          <h3 className="text-gray-700 font-medium mb-3">Selected Payment Method</h3>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center mr-3">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                    <path d="M19 12h2l-3 4-3-4h2V8h-2l3-4 3 4h-2v4z"></path>
                    <path d="M13 12h-2V8H9l3-4 3 4h-2v4z"></path>
                    <path d="M5 12h2v4h2l-3 4-3-4h2v-4z"></path>
                    <path d="M11 16h2v-4h2l-3-4-3 4h2v4z"></path>
                  </svg>
                </div>
                <div>
                  <p className="font-medium">Metamask</p>
                  <p className="text-gray-500 text-sm">{shortenAddress(currentAccount)}</p>
                </div>
              </div>
              <button className="text-green-500 font-medium">Change</button>
            </div>
          </div>
        </div>

        {/* SMS Receipt Option */}
        {phoneNumber && loanDetails.smsRemindersEnabled && (
          <div className="mb-4 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center mb-2">
              <svg className="w-5 h-5 text-blue-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              <span className="font-medium text-blue-700">SMS Receipt</span>
            </div>
            <p className="text-sm text-blue-600">
              A payment confirmation will be sent to {phoneNumber} after successful payment.
            </p>
          </div>
        )}

        {/* Pay Now Button */}
        {isProcessing ? (
          <button 
            className="w-full bg-gray-400 text-white font-medium py-4 rounded-lg flex items-center justify-center cursor-not-allowed"
            disabled
          >
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Processing...
          </button>
        ) : (
          <button 
            className="w-full bg-secondary text-white font-medium py-4 rounded-lg hover:bg-secondaryLight transition duration-200"
            onClick={handlePayNow}
          >
            Pay Now - RM {loanDetails.amount}
          </button>
        )}

        {/* Back Button */}
        <button 
          onClick={() => navigate(`/repay/${loanId}`)}
          className="flex items-center text-blue-700 font-medium mt-4 mx-auto"
          disabled={isProcessing}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
      </div>
    </HalfCircleBackground>
  );
};

export default ReviewSummaryPage;