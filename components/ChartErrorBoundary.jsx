"use client";

import { Component } from "react";

/**
 * Charts and the assistant must not take down the whole strategy terminal.
 */
export default class ChartErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="strategy-error glass-card" role="status">
          <p>{this.props.fallback || "This panel could not render. Strategy cards above are still valid."}</p>
        </div>
      );
    }
    return this.props.children;
  }
}
