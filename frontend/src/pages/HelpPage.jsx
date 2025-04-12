import React, { useState } from 'react';
import { Search, BookOpen, Coffee, MessageCircle, ExternalLink, Download, Key, Users, Award } from 'lucide-react';
import DashboardLayout from '../layouts/DashboardLayout';
import Card from '../components/common/Card';
import Button from '../components/common/Button';

const HelpPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Help categories and articles
  const helpCategories = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      icon: <BookOpen size={24} className="text-indigo-600" />,
      articles: [
        {
          id: 'wallet-setup',
          title: 'Setting Up Your Wallet',
          content: 'Learn how to set up a Web3 wallet like MetaMask to use with BlockVote.',
          url: '#wallet-setup'
        },
        {
          id: 'connect-wallet',
          title: 'Connecting Your Wallet',
          content: 'Step-by-step guide to connecting your wallet to the BlockVote platform.',
          url: '#connect-wallet'
        },
        {
          id: 'first-vote',
          title: 'Casting Your First Vote',
          content: 'A complete walkthrough of the voting process from start to finish.',
          url: '#first-vote'
        },
        {
          id: 'create-election',
          title: 'Creating an Election',
          content: 'How to create and manage your own election on BlockVote.',
          url: '#create-election'
        }
      ]
    },
    {
      id: 'technical-support',
      title: 'Technical Support',
      icon: <Key size={24} className="text-indigo-600" />,
      articles: [
        {
          id: 'network-issues',
          title: 'Network Connection Issues',
          content: 'Troubleshooting common network and connection problems.',
          url: '#network-issues'
        },
        {
          id: 'transaction-errors',
          title: 'Transaction Errors',
          content: 'What to do when your transaction fails or gets stuck.',
          url: '#transaction-errors'
        },
        {
          id: 'gas-fees',
          title: 'Understanding Gas Fees',
          content: 'Learn about blockchain transaction fees and how they work.',
          url: '#gas-fees'
        },
        {
          id: 'wallet-troubleshooting',
          title: 'Wallet Troubleshooting',
          content: 'Solutions for common wallet connection and interaction issues.',
          url: '#wallet-troubleshooting'
        }
      ]
    },
    {
      id: 'voting-process',
      title: 'Voting Process',
      icon: <Users size={24} className="text-indigo-600" />,
      articles: [
        {
          id: 'vote-verification',
          title: 'Verifying Your Vote',
          content: 'How to check that your vote was correctly recorded on the blockchain.',
          url: '#vote-verification'
        },
        {
          id: 'election-types',
          title: 'Types of Elections',
          content: 'Understanding the different election formats available on BlockVote.',
          url: '#election-types'
        },
        {
          id: 'vote-security',
          title: 'Vote Security and Privacy',
          content: 'How BlockVote ensures your vote is secure and your privacy is protected.',
          url: '#vote-security'
        },
        {
          id: 'results-calculation',
          title: 'How Results Are Calculated',
          content: 'Understanding how votes are tallied and winners are determined.',
          url: '#results-calculation'
        }
      ]
    },
    {
      id: 'advanced-features',
      title: 'Advanced Features',
      icon: <Award size={24} className="text-indigo-600" />,
      articles: [
        {
          id: 'delegate-voting',
          title: 'Delegate Voting',
          content: 'How to set up and use delegate voting for organizational elections.',
          url: '#delegate-voting'
        },
        {
          id: 'multi-sig',
          title: 'Multi-Signature Elections',
          content: 'Setting up elections that require multiple approvals.',
          url: '#multi-sig'
        },
        {
          id: 'weighted-voting',
          title: 'Weighted Voting Systems',
          content: 'Implementing voting systems where votes have different weights.',
          url: '#weighted-voting'
        },
        {
          id: 'ipfs-integration',
          title: 'IPFS Integration',
          content: 'How BlockVote uses IPFS for decentralized data storage.',
          url: '#ipfs-integration'
        }
      ]
    }
  ];
  
  // Filter articles based on search term
  const filteredArticles = searchTerm 
    ? helpCategories.flatMap(category => 
        category.articles.filter(article => 
          article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          article.content.toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    : [];
  
  // Render help article preview
  const renderArticlePreview = (article) => (
    <a 
      href={article.url} 
      key={article.id}
      className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
    >
      <h3 className="font-medium text-gray-800 mb-1">{article.title}</h3>
      <p className="text-sm text-gray-600">{article.content}</p>
    </a>
  );
  
  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Help Center</h1>
        <p className="text-gray-600 mt-1">
          Find guides and answers to your questions about BlockVote
        </p>
      </div>
      
      {/* Search Bar */}
      <div className="mb-8">
        <div className="relative max-w-md">
          <input
            type="text"
            placeholder="Search help articles..."
            className="w-full py-3 pl-12 pr-4 text-gray-700 bg-white border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
        </div>
        
        {/* Search Results */}
        {searchTerm && (
          <div className="mt-4">
            <h2 className="text-lg font-bold text-gray-800 mb-3">Search Results</h2>
            {filteredArticles.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredArticles.map(article => renderArticlePreview(article))}
              </div>
            ) : (
              <div className="text-gray-600 p-4 bg-gray-50 rounded-lg">
                No articles found matching "{searchTerm}"
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Help Categories */}
      {!searchTerm && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {helpCategories.map(category => (
            <Card key={category.id}>
              <div className="flex items-center mb-4">
                {category.icon}
                <h2 className="text-xl font-bold text-gray-800 ml-3">{category.title}</h2>
              </div>
              
              <div className="space-y-3">
                {category.articles.map(article => (
                  <a 
                    key={article.id} 
                    href={article.url}
                    className="flex items-start p-3 hover:bg-gray-50 rounded-md transition"
                  >
                    <div>
                      <h3 className="font-medium text-gray-800 mb-1">{article.title}</h3>
                      <p className="text-sm text-gray-600">{article.content}</p>
                    </div>
                    <ExternalLink size={16} className="ml-auto text-gray-400 flex-shrink-0 mt-1" />
                  </a>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
      
      {/* Support Options */}
      {!searchTerm && (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <div className="flex flex-col items-center text-center p-4">
              <div className="bg-indigo-100 p-3 rounded-full mb-4">
                <MessageCircle size={24} className="text-indigo-600" />
              </div>
              <h3 className="font-bold text-gray-800 mb-2">Contact Support</h3>
              <p className="text-gray-600 text-sm mb-4">
                Get personalized help from our support team
              </p>
              <Button 
                variant="primary"
                onClick={() => window.location.href = 'mailto:support@blockvote.com'}
              >
                Email Support
              </Button>
            </div>
          </Card>
          
          <Card>
            <div className="flex flex-col items-center text-center p-4">
              <div className="bg-indigo-100 p-3 rounded-full mb-4">
                <BookOpen size={24} className="text-indigo-600" />
              </div>
              <h3 className="font-bold text-gray-800 mb-2">Documentation</h3>
              <p className="text-gray-600 text-sm mb-4">
                Browse comprehensive documentation
              </p>
              <Button 
                variant="outline"
                onClick={() => window.open('https://docs.blockvote.com', '_blank')}
                className="flex items-center"
              >
                View Docs
                <ExternalLink size={16} className="ml-2" />
              </Button>
            </div>
          </Card>
          
          <Card>
            <div className="flex flex-col items-center text-center p-4">
              <div className="bg-indigo-100 p-3 rounded-full mb-4">
                <Coffee size={24} className="text-indigo-600" />
              </div>
              <h3 className="font-bold text-gray-800 mb-2">Community Forum</h3>
              <p className="text-gray-600 text-sm mb-4">
                Join discussions with other users
              </p>
              <Button 
                variant="outline"
                onClick={() => window.open('https://community.blockvote.com', '_blank')}
                className="flex items-center"
              >
                Join Community
                <ExternalLink size={16} className="ml-2" />
              </Button>
            </div>
          </Card>
        </div>
      )}
      
      {/* Quick Links */}
      {!searchTerm && (
        <div className="mt-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Quick Resources</h2>
          <div className="bg-gray-50 rounded-lg p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <a 
                href="#user-guide"
                className="flex items-center p-3 bg-white rounded-md border border-gray-200 hover:border-indigo-200 hover:shadow-sm transition"
              >
                <Download size={20} className="text-indigo-600 mr-3" />
                <span className="font-medium text-gray-800">Download User Guide (PDF)</span>
              </a>
              <a 
                href="#video-tutorials"
                className="flex items-center p-3 bg-white rounded-md border border-gray-200 hover:border-indigo-200 hover:shadow-sm transition"
              >
                <Download size={20} className="text-indigo-600 mr-3" />
                <span className="font-medium text-gray-800">Video Tutorials</span>
              </a>
              <a 
                href="#faq"
                className="flex items-center p-3 bg-white rounded-md border border-gray-200 hover:border-indigo-200 hover:shadow-sm transition"
              >
                <Download size={20} className="text-indigo-600 mr-3" />
                <span className="font-medium text-gray-800">Frequently Asked Questions</span>
              </a>
              <a 
                href="#security-guide"
                className="flex items-center p-3 bg-white rounded-md border border-gray-200 hover:border-indigo-200 hover:shadow-sm transition"
              >
                <Download size={20} className="text-indigo-600 mr-3" />
                <span className="font-medium text-gray-800">Security Best Practices</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default HelpPage;