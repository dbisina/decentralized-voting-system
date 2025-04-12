import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Search } from 'lucide-react';
import MainLayout from '../layouts/MainLayout';

const FAQPage = () => {
  const [openIndex, setOpenIndex] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  // FAQ categories
  const categories = [
    { id: 'all', name: 'All Questions' },
    { id: 'general', name: 'General' },
    { id: 'technical', name: 'Technical' },
    { id: 'security', name: 'Security' },
    { id: 'voting', name: 'Voting Process' },
  ];

  // FAQ items
  const faqItems = [
    {
      question: 'What is BlockVote?',
      answer: 'BlockVote is a decentralized voting platform built on blockchain technology. It provides a secure, transparent, and tamper-proof system for conducting elections and polls, ensuring that every vote is counted accurately and can be verified by participants.',
      category: 'general'
    },
    {
      question: 'How does blockchain ensure secure voting?',
      answer: 'Blockchain technology provides several security benefits for voting: immutability (once recorded, votes cannot be altered), transparency (all transactions are publicly verifiable while maintaining privacy), decentralization (no single point of failure), and cryptographic security (ensuring only authorized participants can vote).',
      category: 'security'
    },
    {
      question: 'What do I need to use BlockVote?',
      answer: 'To use BlockVote, you need a Web3-compatible wallet like MetaMask, a small amount of cryptocurrency for transaction fees (on networks like Polygon, these fees are minimal), and a device with internet access.',
      category: 'general'
    },
    {
      question: 'Is my vote anonymous?',
      answer: 'While blockchain transactions are public, BlockVote implements privacy measures to ensure that your specific vote choice cannot be linked to your identity. Your wallet address is recorded to prevent double-voting, but the specific candidate you chose is not publicly linked to your address.',
      category: 'security'
    },
    {
      question: 'Which blockchain networks does BlockVote support?',
      answer: 'Currently, BlockVote supports Ethereum and Polygon (Mumbai testnet for development and Polygon mainnet for production). We plan to add support for additional EVM-compatible networks in the future.',
      category: 'technical'
    },
    {
      question: 'How do I create an election?',
      answer: 'To create an election, you need to connect your wallet, navigate to the "Manage Elections" section, and click on "Create New Election." You\'ll then be guided through a step-by-step process to set up your election, including details, candidate information, and voting time periods.',
      category: 'voting'
    },
    {
      question: 'How much does it cost to use BlockVote?',
      answer: 'Using BlockVote involves blockchain transaction fees that vary depending on the network. On Polygon, these fees are typically just a few cents. Creating an election or adding candidates requires transactions, while viewing election results is free. There are no additional fees charged by the BlockVote platform itself.',
      category: 'general'
    },
    {
      question: 'Can I change my vote after it\'s submitted?',
      answer: 'No. Once your vote is recorded on the blockchain, it cannot be changed. This immutability is a key security feature of blockchain-based voting systems, ensuring votes cannot be altered after the fact.',
      category: 'voting'
    },
    {
      question: 'How can I verify my vote was counted correctly?',
      answer: 'Every vote transaction has a unique transaction hash that you can use to verify your vote on a blockchain explorer. Additionally, the smart contract code is open-source and can be audited to ensure votes are counted correctly.',
      category: 'technical'
    },
    {
      question: 'Who can see the election results?',
      answer: 'Election results are publicly visible to anyone who has access to the election. For private elections, only those with the election URL or access to the organization\'s dashboard can see the results. Public elections may have results visible to all BlockVote users.',
      category: 'voting'
    },
    {
      question: 'Is the code open-source?',
      answer: 'Yes, BlockVote\'s smart contracts and frontend code are open-source. You can audit the code on our GitHub repository to verify the security and functionality of the platform.',
      category: 'technical'
    },
    {
      question: 'What happens if I lose access to my wallet?',
      answer: 'If you lose access to your wallet, you may lose the ability to participate in elections or manage elections you\'ve created. We recommend following best practices for securing your wallet, including backing up your recovery phrase in a safe location.',
      category: 'security'
    },
    {
      question: 'Can BlockVote be used for large-scale elections?',
      answer: 'BlockVote is designed to be scalable and can handle elections of various sizes. However, for very large elections (millions of voters), additional optimizations and layer-2 solutions may be implemented to ensure efficiency and reasonable transaction costs.',
      category: 'general'
    },
    {
      question: 'What happens if there\'s a tie in the voting results?',
      answer: 'The election administrator can define tie-breaking rules when creating the election. By default, if there\'s a tie, the candidate who received votes first (chronologically) will be declared the winner.',
      category: 'voting'
    },
    {
      question: 'How are candidates added to an election?',
      answer: 'Candidates can be added by the election administrator during the election creation process or later before the election starts. Each candidate requires basic information such as name and optional details like platform, bio, and photo.',
      category: 'voting'
    }
  ];

  // Toggle FAQ item
  const toggleItem = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  // Filter FAQ items by search term and category
  const filteredFaqs = faqItems.filter(item => {
    const matchesSearch = item.question.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.answer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
    
    return matchesSearch && matchesCategory;
  });

  return (
    <MainLayout>
      <div className="pt-24 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-6 text-center">
            Frequently Asked Questions
          </h1>
          <p className="text-xl text-gray-600 mb-10 max-w-3xl mx-auto text-center">
            Find answers to common questions about BlockVote and blockchain voting.
          </p>

          {/* Search and filter */}
          <div className="mb-12">
            <div className="relative max-w-md mx-auto mb-8">
              <input
                type="text"
                placeholder="Search questions..."
                className="w-full py-3 pl-12 pr-4 text-gray-700 bg-white border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            </div>

            <div className="flex flex-wrap justify-center gap-2">
              {categories.map(category => (
                <button
                  key={category.id}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                    activeCategory === category.id
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  onClick={() => setActiveCategory(category.id)}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>

          {/* FAQ items */}
          <div className="max-w-3xl mx-auto divide-y divide-gray-200">
            {filteredFaqs.length > 0 ? (
              filteredFaqs.map((faq, index) => (
                <div key={index} className="py-6">
                  <button
                    className="flex justify-between items-start w-full text-left focus:outline-none"
                    onClick={() => toggleItem(index)}
                  >
                    <h3 className="text-lg font-semibold text-gray-800 pr-8">{faq.question}</h3>
                    {openIndex === index ? (
                      <ChevronUp className="flex-shrink-0 text-indigo-600" size={20} />
                    ) : (
                      <ChevronDown className="flex-shrink-0 text-indigo-600" size={20} />
                    )}
                  </button>
                  {openIndex === index && (
                    <div className="mt-3 text-gray-600">
                      <p>{faq.answer}</p>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="py-12 text-center">
                <p className="text-gray-500">No FAQs found matching your search criteria.</p>
                <button
                  className="mt-4 text-indigo-600 hover:text-indigo-800"
                  onClick={() => {
                    setSearchTerm('');
                    setActiveCategory('all');
                  }}
                >
                  Clear filters
                </button>
              </div>
            )}
          </div>

          {/* Contact section */}
          <div className="mt-16 bg-gray-50 rounded-lg p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Still have questions?
            </h2>
            <p className="text-gray-600 mb-6">
              If you couldn't find the answer you were looking for, please contact our support team.
            </p>
            <a
              href="mailto:support@blockvote.com"
              className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-md font-medium hover:bg-indigo-700 transition"
            >
              Contact Support
            </a>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default FAQPage;