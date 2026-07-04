import { Component } from 'react';
import { AlertOctagon } from 'lucide-react';
import Button from './ui/Button';

/**
 * Top-level safety net. Firestore calls, third-party libs, or a bad render
 * anywhere in the tree would otherwise blank the entire screen with no
 * explanation. This catches it and offers a way back instead.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('Unhandled UI error:', error, info);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-surface flex items-center justify-center px-4">
          <div className="max-w-sm w-full bg-white rounded-3xl border border-stone-100 shadow-warm-lg p-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-3">
              <AlertOctagon className="w-6 h-6" />
            </div>
            <h1 className="text-lg font-bold text-stone-800 font-display mb-1">Đã có lỗi xảy ra</h1>
            <p className="text-sm text-stone-500 mb-5">
              Ứng dụng gặp sự cố không mong muốn. Vui lòng thử tải lại trang.
            </p>
            <Button fullWidth onClick={this.handleReload}>Quay về trang chủ</Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
