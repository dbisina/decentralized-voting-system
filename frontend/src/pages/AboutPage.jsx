import React from 'react';
import { Shield, Database, Lock, ArrowRight } from 'lucide-react';
import MainLayout from '../layouts/MainLayout';

const AboutPage = () => {
  return (
    <MainLayout>
      {/* Hero Section */}
      <div className="pt-24 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-6 text-center">
            About BlockVote
          </h1>
          <p className="text-xl text-gray-600 mb-10 max-w-3xl mx-auto text-center">
            Revolutionizing democracy through transparent and secure blockchain-based voting systems.
          </p>
        </div>
      </div>

      {/* Mission Section */}
      <div className="py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-800 mb-6">Our Mission</h2>
              <p className="text-gray-600 mb-6">
                At BlockVote, we're committed to transforming the electoral process through 
                blockchain technology. We believe everyone deserves access to secure, 
                transparent, and efficient voting systems.
              </p>
              <p className="text-gray-600 mb-6">
                Our mission is to eliminate voter fraud, prevent vote tampering, and increase 
                trust in democratic procedures by leveraging the immutability and transparency 
                of blockchain technology.
              </p>
              <p className="text-gray-600">
                By decentralizing the voting process, we're removing the need for central 
                authorities, thereby enhancing security while preserving voter privacy.
              </p>
            </div>
            <div className="rounded-lg overflow-hidden shadow-lg">
              <img 
                src="/api/placeholder/600/400" 
                alt="Secure Voting" 
                className="w-full h-auto"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Technology Section */}
      <div className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-gray-800 mb-12 text-center">Our Technology</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-gray-50 p-6 rounded-xl">
              <div className="bg-indigo-100 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                <Database size={24} className="text-indigo-600" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-gray-800">Blockchain Foundation</h3>
              <p className="text-gray-600">
                Built on Ethereum and Polygon networks, our platform leverages smart contracts to create 
                an immutable record of votes that cannot be altered or tampered with.
              </p>
            </div>
            <div className="bg-gray-50 p-6 rounded-xl">
              <div className="bg-indigo-100 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                <Lock size={24} className="text-indigo-600" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-gray-800">Secure Authentication</h3>
              <p className="text-gray-600">
                Using Web3 wallet integration, we ensure that only authorized voters can participate 
                in elections while maintaining the privacy and security of each vote.
              </p>
            </div>
            <div className="bg-gray-50 p-6 rounded-xl">
              <div className="bg-indigo-100 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                <Shield size={24} className="text-indigo-600" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-gray-800">Decentralized Storage</h3>
              <p className="text-gray-600">
                With IPFS integration, we store election data in a distributed manner, ensuring 
                that no single entity controls the information and eliminating single points of failure.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Team Section */}
      <div className="py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-gray-800 mb-12 text-center">Our Team</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-xl shadow-sm text-center">
              <img 
                src="/api/placeholder/120/120" 
                alt="Team Member" 
                className="w-24 h-24 rounded-full mx-auto mb-4 object-cover"
              />
              <h3 className="text-xl font-bold mb-1 text-gray-800">Alex Johnson</h3>
              <p className="text-gray-500 mb-3">Founder & Lead Developer</p>
              <p className="text-gray-600 text-sm">
                Blockchain expert with 8+ years of experience in developing decentralized applications.
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm text-center">
              <img 
                src="/api/placeholder/120/120" 
                alt="Team Member" 
                className="w-24 h-24 rounded-full mx-auto mb-4 object-cover"
              />
              <h3 className="text-xl font-bold mb-1 text-gray-800">Sarah Chen</h3>
              <p className="text-gray-500 mb-3">CTO & Security Specialist</p>
              <p className="text-gray-600 text-sm">
                Cybersecurity professional focused on ensuring the integrity and security of voting systems.
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm text-center">
              <img 
                src="/api/placeholder/120/120" 
                alt="Team Member" 
                className="w-24 h-24 rounded-full mx-auto mb-4 object-cover"
              />
              <h3 className="text-xl font-bold mb-1 text-gray-800">Michael Rodriguez</h3>
              <p className="text-gray-500 mb-3">UX Designer & Front-end Lead</p>
              <p className="text-gray-600 text-sm">
                User experience expert dedicated to making blockchain technology accessible to everyone.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-16 bg-indigo-600 text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to Experience Secure Voting?</h2>
          <p className="text-indigo-100 mb-8 text-lg">
            Join the blockchain revolution and see how BlockVote is changing the future of elections.
          </p>
          <a 
            href="/dashboard" 
            className="inline-flex items-center px-6 py-3 bg-white text-indigo-600 rounded-md font-medium hover:bg-gray-100 transition"
          >
            Get Started
            <ArrowRight size={18} className="ml-2" />
          </a>
        </div>
      </div>
    </MainLayout>
  );
};

export default AboutPage;