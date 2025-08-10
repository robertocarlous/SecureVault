'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { MultisigFactoryContract } from '../app/index';
import { Plus, Building2, Users, Shield, CheckCircle, AlertCircle, X } from 'lucide-react';


interface WalletCreatorProps {
  onWalletCreated?: () => void;
  onClose?: () => void;
}

export default function WalletCreator({ onWalletCreated, onClose }: WalletCreatorProps) {
  const { address } = useAccount();
  const [signers, setSigners] = useState<string[]>(['']);
  const [threshold, setThreshold] = useState<number>(1);
  const [walletName, setWalletName] = useState<string>('');

  // Contract write hook for creating wallet
  const { data: createWalletData, writeContract, isPending } = useWriteContract();

  // Wait for transaction
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: createWalletData,
  });

  // Reset form when wallet is created successfully
  useEffect(() => {
    if (isSuccess) {
      setSigners(['']);
      setThreshold(1);
      setWalletName('');
      // Notify parent component that wallet was created
      if (onWalletCreated) {
        onWalletCreated();
      }
    }
  }, [isSuccess, onWalletCreated]);

  const addSigner = () => {
    setSigners([...signers, '']);
  };

  const removeSigner = (index: number) => {
    if (signers.length > 1) {
      const newSigners = signers.filter((_, i) => i !== index);
      setSigners(newSigners);
      // Adjust threshold if needed
      if (threshold > newSigners.length) {
        setThreshold(newSigners.length);
      }
    }
  };

  const updateSigner = (index: number, value: string) => {
    const newSigners = [...signers];
    newSigners[index] = value;
    setSigners(newSigners);
  };

  const handleCreateWallet = async () => {
    if (!address) return;

    // Filter out empty signers and add current user if not present
    const validSigners = signers.filter(signer => signer.trim() !== '');
    if (!validSigners.includes(address)) {
      validSigners.push(address);
    }

    if (validSigners.length === 0) {
      alert('Please add at least one signer');
      return;
    }

    if (threshold > validSigners.length) {
      alert('Threshold cannot be greater than number of signers');
      return;
    }

    try {
      // Call the contract
      writeContract({
        address: MultisigFactoryContract.address as `0x${string}`,
        abi: MultisigFactoryContract.abi,
        functionName: 'createWallet',
        args: [validSigners, threshold],
      });
    } catch (error) {
      console.error('Error creating wallet:', error);
    }
  };

  return (
    <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
      <div className="max-w-2xl mx-auto">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 p-8 text-white relative">
          {onClose && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          )}
          <div className="text-center">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-3xl font-bold mb-2">Enterprise Treasury Setup</h2>
            <p className="text-blue-100 text-lg">Configure your secure multi-signature treasury for cNGN management</p>
          </div>
        </div>

        <div className="p-8 space-y-8">
          {/* Treasury Name */}
          <div className="space-y-3">
            <label className="block text-sm font-bold text-gray-800 uppercase tracking-wide">
              Treasury Name
            </label>
            <input
              type="text"
              value={walletName}
              onChange={(e) => setWalletName(e.target.value)}
              placeholder="e.g., Main Treasury, Payroll Wallet, Operations Fund"
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-4 text-lg focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white shadow-sm"
            />
            <p className="text-sm text-gray-600 flex items-center">
              <Shield className="w-4 h-4 mr-2 text-blue-500" />
              Choose a descriptive name for easy identification across your organization
            </p>
          </div>

          {/* Authorized Signers */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-bold text-gray-800 uppercase tracking-wide">
                Authorized Signers ({signers.length})
              </label>
              <div className="flex items-center space-x-2 px-3 py-1 bg-blue-50 rounded-lg">
                <Users className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">Multi-Signature Security</span>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-2xl p-6 space-y-4">
              {signers.map((signer, index) => (
                <div key={index} className="flex space-x-3">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={signer}
                      onChange={(e) => updateSigner(index, e.target.value)}
                      placeholder="0x... (Ethereum address)"
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white"
                    />
                  </div>
                  {signers.length > 1 && (
                    <button
                      onClick={() => removeSigner(index)}
                      className="px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors duration-200 font-medium shadow-lg"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              
              <button
                onClick={addSigner}
                className="w-full px-4 py-4 bg-white border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 text-gray-700 hover:text-blue-600 rounded-xl transition-all duration-200 font-medium flex items-center justify-center space-x-2"
              >
                <Plus className="w-5 h-5" />
                <span>Add Another Signer</span>
              </button>
            </div>
          </div>

          {/* Security Threshold */}
          <div className="space-y-4">
            <label className="block text-sm font-bold text-gray-800 uppercase tracking-wide">
              Security Threshold
            </label>
            
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-2xl font-bold text-gray-900">{threshold}</span>
                <span className="text-lg text-gray-600">of {signers.length} signers required</span>
              </div>
              
              <input
                type="range"
                min="1"
                max={signers.length}
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                style={{
                  background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(threshold / signers.length) * 100}%, #e5e7eb ${(threshold / signers.length) * 100}%, #e5e7eb 100%)`
                }}
              />
              
              <div className="mt-4 p-4 bg-white rounded-xl border border-blue-200">
                <p className="text-sm text-gray-700 leading-relaxed">
                  <strong>{threshold}</strong> out of <strong>{signers.length}</strong> authorized signers must approve each transaction before it can be executed. 
                  Higher thresholds provide more security but require more coordination.
                </p>
              </div>
            </div>
          </div>

          {/* Create Button */}
          <div className="pt-4">
            <button
              onClick={handleCreateWallet}
              disabled={isPending || isConfirming || !address}
              className="w-full bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 hover:from-blue-700 hover:via-blue-800 hover:to-indigo-900 text-white py-5 rounded-xl text-lg font-bold transition-all duration-200 shadow-xl hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-xl flex items-center justify-center space-x-3"
            >
              {isPending ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Creating Treasury...</span>
                </>
              ) : isConfirming ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Confirming Transaction...</span>
                </>
              ) : (
                <>
                  <Building2 className="w-6 h-6" />
                  <span>Create Enterprise Treasury</span>
                </>
              )}
            </button>
          </div>

          {/* Status Messages */}
          {isSuccess && (
            <div className="p-6 bg-green-50 border-2 border-green-200 text-green-800 rounded-xl">
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <div>
                  <p className="font-bold text-lg">✅ Treasury Created Successfully!</p>
                  <p className="text-sm mt-1">Transaction hash: {createWalletData}</p>
                  <p className="text-sm mt-2">Your enterprise treasury is now ready for secure cNGN management.</p>
                </div>
              </div>
            </div>
          )}

          {!address && (
            <div className="p-6 bg-amber-50 border-2 border-amber-200 text-amber-800 rounded-xl">
              <div className="flex items-center space-x-3">
                <AlertCircle className="w-6 h-6 text-amber-600" />
                <div>
                  <p className="font-bold">⚠️ Wallet Connection Required</p>
                  <p className="text-sm mt-1">Please connect your Web3 wallet to create a treasury</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}