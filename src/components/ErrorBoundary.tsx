import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    message: '',
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: error.message || 'حدث خطأ غير متوقع أثناء عرض الصفحة.',
    };
  }

  public componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Application ErrorBoundary:', error, info);
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, message: '' });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          dir="rtl"
          className="flex min-h-screen items-center justify-center bg-[#F3F4F6] px-4 py-12 dark:bg-[#0D0D0F]"
        >
          <div className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-8 text-center dark:border-neutral-800 dark:bg-[#16161A]">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-[#E31B23]/10 text-[#E31B23]">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h1 className="font-display text-xl font-bold text-[#151515] dark:text-white">
              عذراً، تعذر تحميل هذه الصفحة
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
              حدث خلل تقني مؤقت أثناء الاتصال بالخدمة. يمكنك إعادة تحميل الصفحة والمحاولة من جديد.
            </p>
            <button
              type="button"
              onClick={this.handleReset}
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-lg bg-[#E31B23] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#B5121B]"
            >
              <RotateCcw className="h-4 w-4" />
              العودة إلى الرئيسية
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
