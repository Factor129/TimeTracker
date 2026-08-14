import React from 'react'
import ReactDOM from 'react-dom/client'
import Widget from './Widget'
import './styles.css'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <Widget />
  </React.StrictMode>
)
