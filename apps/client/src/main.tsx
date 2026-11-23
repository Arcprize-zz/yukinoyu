import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { connect } from './net/connection';
import './styles.css';

// 서버 접속은 React 바깥에서 한 번만(StrictMode의 이펙트 두 번 실행과 무관하게)
connect();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
