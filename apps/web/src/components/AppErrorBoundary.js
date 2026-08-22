import { jsx as _jsx } from "react/jsx-runtime";
import { Component } from 'react';
import { Result, Button } from 'antd';
/**
 * Top-level error boundary — catches unhandled render errors and displays a
 * safe recovery screen instead of a blank white page.
 */
export class AppErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }
    static getDerivedStateFromError() {
        return { hasError: true };
    }
    componentDidCatch(error) {
        console.error('[AppErrorBoundary] Unhandled render error:', error);
    }
    render() {
        if (this.state.hasError) {
            return (_jsx("div", { style: {
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    minHeight: '100vh',
                }, children: _jsx(Result, { status: "error", title: "\u0425\u0430\u0442\u043E\u043B\u0438\u043A \u044E\u0437 \u0431\u0435\u0440\u0434\u0438", subTitle: "\u0418\u043B\u0442\u0438\u043C\u043E\u0441, sahifani yangilang yoki keyinroq urinib ko'ring.", extra: _jsx(Button, { type: "primary", onClick: () => window.location.reload(), children: "\u042F\u043D\u0433\u0438\u043B\u0430\u0448" }) }) }));
        }
        return this.props.children;
    }
}
