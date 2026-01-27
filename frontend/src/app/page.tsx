'use client';

import Link from 'next/link';
import { 
  LayoutGrid, 
  TrendingUp,
  Zap,
  Server,
  ArrowRight,
  Layers
} from 'lucide-react';
import { NetworkStats } from '@/components/ui/network-stats';

const features = [
  {
    icon: LayoutGrid,
    title: '3D Designer',
    description: 'Professional 3D layout designer for mining infrastructure',
    href: '/designer',
    color: 'bg-hearst-green',
  },
  {
    icon: Server,
    title: 'Object Library',
    description: 'Create and manage containers, cooling, PDU, and modules',
    href: '/objects',
    color: 'bg-blue-500',
  },
];

const stats = [
  { label: 'Supported ASICs', value: '8+', icon: Server },
  { label: 'Calculation Accuracy', value: '99.9%', icon: TrendingUp },
  { label: 'Power Efficiency', value: 'Optimized', icon: Zap },
];

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-white">
        <div className="absolute inset-0 bg-grid opacity-50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-5xl md:text-7xl font-bold text-slate-900 tracking-tight mb-6">
              Hearst Mining
              <span className="block text-hearst-green">Architect</span>
            </h1>
            <p className="text-xl md:text-2xl text-slate-600 max-w-3xl mx-auto mb-10">
              Design, calculate, and optimize your Bitcoin mining farm 
              with professional-grade tools
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/designer"
                className="inline-flex items-center gap-2 px-8 py-4 bg-hearst-green rounded-full font-semibold text-slate-900 hover:bg-hearst-green-dark transition-all duration-300 hover:scale-105 shadow-lg"
              >
                Open Designer
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/objects"
                className="inline-flex items-center gap-2 px-8 py-4 bg-white border-2 border-slate-200 rounded-full font-semibold text-slate-900 hover:border-hearst-green transition-all duration-300"
              >
                <Layers className="w-5 h-5" />
                Browse Library
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Network Stats */}
      <section className="py-8 bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <NetworkStats />
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-slate-900 mb-4">
            Complete Mining Toolkit
          </h2>
          <p className="text-lg text-slate-600 text-center max-w-2xl mx-auto mb-12">
            Everything you need to plan, build, and manage a profitable mining operation
          </p>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => (
              <Link
                key={feature.title}
                href={feature.href}
                className="group p-6 bg-white border border-slate-200 rounded-2xl hover:border-hearst-green/50 hover:shadow-xl transition-all duration-300"
              >
                <div className={`w-12 h-12 ${feature.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-slate-600 text-sm">
                  {feature.description}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="text-center p-6"
              >
                <stat.icon className="w-8 h-8 text-hearst-green mx-auto mb-4" />
                <div className="text-4xl font-bold text-slate-900 mb-2">
                  {stat.value}
                </div>
                <div className="text-slate-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-slate-900">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Design Your Mining Farm?
          </h2>
          <p className="text-lg text-slate-400 mb-8">
            Start building your infrastructure with our professional 3D designer
          </p>
          <Link
            href="/designer"
            className="inline-flex items-center gap-2 px-8 py-4 bg-hearst-green rounded-full font-semibold text-slate-900 hover:bg-hearst-green-dark transition-all duration-300 hover:scale-105"
          >
            Open 3D Designer
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}
