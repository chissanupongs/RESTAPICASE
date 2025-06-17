import React from 'react';
import { ApolloClient, InMemoryCache, ApolloProvider } from '@apollo/client';
import CaseForm from './components/CaseForm.jsx';
import CaseList from './components/CaseList.jsx';
import Toast from './components/Toast.jsx';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';

const client = new ApolloClient({
  uri: 'http://localhost:8000/graphql',
  cache: new InMemoryCache(),
});

export default function App() {
  return (
    <ApolloProvider client={client}>
      <div style={{ padding: 20, maxWidth: 900, margin: 'auto' }}>
        <h1>Case Management</h1>
        <CaseForm />
        <CaseList />
        <Toast />
      </div>
    </ApolloProvider>
  );
}
