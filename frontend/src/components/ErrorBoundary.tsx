import { Component, type ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

interface Props { children: ReactNode }
interface S { hasError: boolean; message: string }

export class ErrorBoundary extends Component<Props, S> {
  state: S = { hasError: false, message: "" };

  static getDerivedStateFromError(err: Error): S {
    return { hasError: true, message: err.message };
  }

  componentDidCatch(err: Error) {
    console.error("UI error boundary:", err);
  }

  retry = () => this.setState({ hasError: false, message: "" });

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-8">
        <div className="glass-card p-8 max-w-md text-center space-y-4">
          <AlertTriangle className="w-10 h-10 text-rose-400 mx-auto" />
          <h2 className="text-xl font-semibold">Something went off-road.</h2>
          <p className="sub">{this.state.message || "Unexpected UI error."}</p>
          <button className="btn-primary mx-auto" onClick={this.retry}>
            <RotateCcw className="w-4 h-4" /> Retry
          </button>
        </div>
      </div>
    );
  }
}
