import React, { Component, ErrorInfo, ReactNode, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

declare global {
  interface Window {
    __MADRASATI_BOOTED__?: boolean;
  }
}

// 1. Diagnostics logs in runtime
console.log("[Madrasati] main.tsx loaded");
console.log("[Madrasati] BASE_URL:", (import.meta as any).env.BASE_URL);
console.log("[Madrasati] Location:", window.location.href);

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[Madrasati] عطل غير متوقع:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div dir="rtl" className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-100 p-6" style={{ fontFamily: 'Cairo, sans-serif' }}>
          <div className="max-w-2xl w-full bg-slate-800 rounded-2xl p-8 shadow-2xl border border-red-500/30 text-center flex flex-col gap-4">
            <span className="material-symbols-outlined text-red-500 text-5xl mx-auto">error</span>
            <h1 className="text-2xl font-black text-white">حدث خطأ أثناء تشغيل التطبيق</h1>
            <p className="text-slate-300 text-sm leading-relaxed">
              نأسف لهذا العطل غير المتوقع. يرجى محاولة تحديث الصفحة أو مراجعة وحدة تحكم المطورين لمزيد من التفاصيل.
            </p>
            {this.state.error && (
              <div className="text-right">
                <p className="text-xs text-red-400 font-bold mb-1">تفاصيل الخطأ:</p>
                <pre className="bg-slate-950/80 p-4 rounded-xl text-xs text-red-300 font-mono text-left overflow-auto max-h-60 whitespace-pre-wrap break-all">
                  <strong>Message:</strong> {this.state.error.message}
                  {"\n\n"}
                  <strong>Stack:</strong> {this.state.error.stack}
                </pre>
              </div>
            )}
            <button 
              onClick={() => {
                localStorage.clear();
                window.location.reload();
              }} 
              className="mt-2 py-2.5 px-5 bg-gradient-to-r from-red-600 to-purple-600 hover:from-red-700 hover:to-purple-700 text-white rounded-full font-bold text-sm shadow-lg active:scale-95 transition-all cursor-pointer"
            >
              مسح البيانات وإعادة تحميل الصفحة
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// 2. Validate root element with inline error reporting
const rootElement = document.getElementById('root');

if (!rootElement) {
  console.error("[Madrasati] Root element #root not found!");
  document.body.innerHTML = `
    <div dir="rtl" style="padding:40px; font-family: sans-serif; text-align: center; color: #7a0000; background: #fff5f5; border: 2px solid #feb2b2; margin: 40px auto; max-width: 600px; border-radius: 12px;">
      <h1 style="font-size: 24px; margin-bottom: 12px;">فشل تشغيل التطبيق</h1>
      <p style="font-size: 16px;">لم يتم العثور على عنصر التثبيت <code>&lt;div id="root"&gt;&lt;/div&gt;</code> داخل ملف <code>index.html</code>.</p>
    </div>
  `;
  throw new Error("Root element #root not found");
}

// 3. Render React with strict try/catch boundary
try {
  createRoot(rootElement).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  );
  window.__MADRASATI_BOOTED__ = true;
  console.log("[Madrasati] React booted successfully");
} catch (error: any) {
  console.error("[Madrasati] Fatal render error:", error);
  rootElement.innerHTML = `
    <div dir="rtl" style="padding:40px; font-family: sans-serif; text-align: center; color: #7a0000; background: #fff5f5; border: 2px solid #feb2b2; margin: 40px auto; max-width: 600px; border-radius: 12px;">
      <h1 style="font-size: 24px; margin-bottom: 12px;">فشل تشغيل التطبيق (Fatal Render Error)</h1>
      <p style="font-size: 16px;">حدث خطأ قاتل أثناء محاولة تشغيل واجهة React:</p>
      <pre style="text-align: left; background: #1a202c; color: #fc8181; padding: 16px; border-radius: 8px; font-size: 13px; overflow: auto; max-height: 250px; direction: ltr;">
        ${error?.stack || error?.message || String(error)}
      </pre>
    </div>
  `;
}
