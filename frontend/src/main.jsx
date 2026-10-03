import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { AuthProvider } from './context/AuthContext'
import { NotificationProvider } from './context/NotificationContext'

// Global error boundary: catches any render-time JS errors
// and shows a helpful message instead of a blank page
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('App crashed:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#fef2f2',
          fontFamily: 'system-ui, sans-serif',
          padding: 24,
          textAlign: 'center'
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🍽️</div>
          <h1 style={{ color: '#dc2626', fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
            Food Connect – Something went wrong
          </h1>
          <p style={{ color: '#6b7280', marginBottom: 24, maxWidth: 480 }}>
            The application encountered an unexpected error. Please refresh the page.
          </p>
          <pre style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 8,
            padding: 16,
            color: '#dc2626',
            fontSize: 12,
            maxWidth: 640,
            overflowX: 'auto',
            marginBottom: 24
          }}>
            {this.state.error?.message}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              padding: '12px 28px',
              fontSize: 16,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Reload Page
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <NotificationProvider>
          <App />
        </NotificationProvider>
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
