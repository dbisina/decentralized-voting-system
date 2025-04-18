import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Web3Provider } from './contexts/Web3Context';
import { AuthProvider } from './contexts/AuthContext';
import { VoterRegistrationProvider } from './contexts/VoterRegistrationContext';

// Pages
import HomePage from './pages/HomePage';
import VotingDashboard from './pages/VotingDashboard';
import VoteCastingPage from './pages/VoteCastingPage';
import ElectionManagement from './pages/ElectionManagement';
import ResultsPage from './pages/ResultsPage';
import CreateElectionPage from './pages/CreateElectionPage';
import CandidateManagementPage from './pages/CandidateManagementPage';
import AboutPage from './pages/AboutPage';
import FAQPage from './pages/FAQPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import HelpPage from './pages/HelpPage';
import VoterRegistrationPage from './pages/VotersRegisterationPage';
import VoterRegistrationManagementPage from './pages/VotersRegisterationManagementPage.jsx';
import ContractTester from './pages/ContractTester.jsx';
import CandidateDebugger from './pages/CandidateDebugger.jsx';

// Protected route component
const ProtectedRoute = ({ children }) => {
  // We can access auth context here to check if user is authenticated
  const isAuthenticated = localStorage.getItem('isConnected') === 'true';
  
  if (!isAuthenticated) {
    // Redirect to home page if not authenticated
    return <Navigate to="/" replace />;
  }
  
  return children;
};

const App = () => {
  return (
    <Router>
      <Web3Provider>
        <AuthProvider>
          <VoterRegistrationProvider>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/faq" element={<FAQPage />} />
              <Route path="/register/:electionId/:registrationCode" element={<VoterRegistrationPage />} />
              <Route path="/contract-test" element={<ContractTester />} />
              <Route path="/candidate-debug" element={<CandidateDebugger />} />
              
              {/* Protected Routes */}
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <VotingDashboard />
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/vote/:electionId" 
                element={
                  <ProtectedRoute>
                    <VoteCastingPage />
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/election/:electionId" 
                element={
                  <ProtectedRoute>
                    <ResultsPage />
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/manage" 
                element={
                  <ProtectedRoute>
                    <ElectionManagement />
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/create-election" 
                element={
                  <ProtectedRoute>
                    <CreateElectionPage />
                  </ProtectedRoute>
                } 
              />
              
              {/* New route for candidate management */}
              <Route 
                path="/manage-candidates/:electionId" 
                element={
                  <ProtectedRoute>
                    <CandidateManagementPage />
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/profile" 
                element={
                  <ProtectedRoute>
                    <ProfilePage />
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/settings" 
                element={
                  <ProtectedRoute>
                    <SettingsPage />
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/manage-registrations/:electionId" 
                element={
                  <ProtectedRoute>
                    <VoterRegistrationManagementPage />
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/help" 
                element={
                  <ProtectedRoute>
                    <HelpPage />
                  </ProtectedRoute>
                } 
              />
              
              {/* Fallback Route - Redirect to home if no match */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </VoterRegistrationProvider>
        </AuthProvider>
      </Web3Provider>
    </Router>
  );
};

export default App;