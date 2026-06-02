import { Component, type ReactNode } from 'react'
import { sanitizeForLog } from '@/lib/utils'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', sanitizeForLog(error.message), sanitizeForLog(errorInfo.componentStack ?? ''))
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-8 text-center">
          <p className="text-red-400 font-bold mb-2">Something went wrong</p>
          <p className="text-white/50 text-sm">{this.state.error?.message}</p>
        </div>
      )
    }
    return this.props.children
  }
}
