"use client";
import React, { useState } from 'react';
import { Check, ChevronDown, Menu, X } from 'lucide-react';
import { Sparkles, Rocket } from 'lucide-react';
import Link from "next/link";

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('basic');


  const integrations = [
    { name: 'Notion', url: 'https://mcusercontent.com/7e625ac7d88971ac43e4120d8/images/bf2e457c-1c8e-9444-be7d-56c455a4a416.png' },
    { name: 'Figma', url: 'https://mcusercontent.com/7e625ac7d88971ac43e4120d8/images/3072fa8c-2872-d988-5d94-b90c8cdfc118.png' },
    { name: 'Unsplash', url: 'https://mcusercontent.com/7e625ac7d88971ac43e4120d8/images/aa57f78b-ecc5-2f7d-229c-b0412f8a933a.png' },
    { name: 'Zendesk', url: 'https://mcusercontent.com/7e625ac7d88971ac43e4120d8/images/19869774-d658-e2a6-b2f2-36357bfa800b.png' },
    { name: 'Slack', url: 'https://mcusercontent.com/7e625ac7d88971ac43e4120d8/images/9635567b-ccf4-0c94-cf38-73f6ba70bc4a.png' },
    { name: 'Google', url: 'https://mcusercontent.com/7e625ac7d88971ac43e4120d8/images/2004ea5d-ca25-1698-9120-c1e42d53b0f3.png' },
    { name: 'Atlassian', url: 'https://mcusercontent.com/7e625ac7d88971ac43e4120d8/images/cff9782f-2a72-9133-9089-eb33cb132d81.png' },
    { name: 'Microsoft Teams', url: 'https://mcusercontent.com/7e625ac7d88971ac43e4120d8/images/415ee0f4-0bd5-2939-9069-77586f5c3c9d.png' },

  ];
  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white">
      {/* Navigation */}
      <nav className="container mx-auto px-6 py-4">
        <div className="flex justify-between items-center">
          {/* Logo Image */}
          <div className="flex items-center">
            <img
              src="https://mcusercontent.com/7e625ac7d88971ac43e4120d8/images/4be4d70d-b665-8547-1b92-c162f1a99aa2.png"
              alt="Knowva Logo"
              className="w-[89px] h-[20px] aspect-[89/20]"
            />
          </div>

          <div className="hidden md:flex items-center gap-8">
            <Link href="/login" className="text-gray-600 hover:text-gray-900">Sign In</Link>
            <Link href="/signup" className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
              Get Started
            </Link>
          </div>
          <button
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>



      {/* Hero Section */}
      <section
        className="container mx-auto px-6 py-20 text-center bg-[url('https://mcusercontent.com/7e625ac7d88971ac43e4120d8/images/f2b0aa66-4272-dcf6-260d-d8d56d744e1b.png')] bg-no-repeat bg-contain bg-center"
      >
        {/* Integration Icons Animation */}
        <div className="relative h-32 mb-12">

        </div>

        <h1 className="fade-in text-5xl font-bold text-gray-900 mb-6 ">
          Know what's real.
        </h1>
        <p className="fade-in text-[16px] text-[#202020] mb-8">
          One place to ask. One truth with sources. One click to act.
        </p>
        <Link href="/signup" className="fade-in px-10 py-2 bg-purple-600 text-white rounded-lg text-md font-medium hover:bg-purple-700 transition-colors">
          Start Free
        </Link>
        
        <p className="fade-in mt-4 italic text-sm text-gray-500">
          <br />
          Connect in minutes. Your permissions, respected.
        </p>
      </section>


      {/* Search Demo Section */}
      <section className="container mx-auto px-6 py-16" >
        <div className="max-w-4xl mx-auto fade-in">
          <img
            src="https://mcusercontent.com/7e625ac7d88971ac43e4120d8/images/f71a36e3-54b2-6546-0b50-118c949828f9.png"
            alt="Descriptive text for the image"
            className="w-full h-auto rounded-xl shadow-lg"
          />
        </div>
      </section>

      {/* Why Choose Section */}
      <section className="py-20 px-6 fade-in">
        <div className="container mx-auto">
          <p className="text-purple-600 font-semibold text-center mb-2">Why search isn't enough</p>
          <br />
          <h2 className="text-4xl font-bold text-center text-gray-900 mb-12">
            Less chasing. Fewer surprises. Faster decisions.
          </h2>

          <p className="text-center  mb-12 max-w-2xl mx-auto text-[#202020]">
            Work lives in too many places. People chase status. Plans drift. Risks surface late. You need the truth, not ten tabs.
          </p>

          <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {/* Row 1 */}
            <div className="flex gap-8">
              <div className="bg-[#F7F1FF] p-6 rounded-lg shadow-sm border border-purple-300 w-1/2">
                <h3 className="font-medium text-gray-900 mb-2">Decision-Ready Answers</h3>
              </div>
              <div className="bg-[#F7F1FF] p-6 rounded-lg shadow-sm border border-purple-300 w-1/2">
                <h3 className="font-medium text-gray-900 mb-2">Status, Owners, Next Step Up-front. With Receipts. </h3>
        
              </div>
            </div>

            {/* Row 2 */}
            <div className="flex gap-8">
              <div className="bg-[#F7F1FF] p-6 rounded-lg shadow-sm border border-purple-300 w-1/2">
                <h3 className="font-medium text-gray-900 mb-2">Proactive Flags </h3>
                
              </div>
              <div className="bg-[#F7F1FF] p-6 rounded-lg shadow-sm border border-purple-300 w-1/2">
                <h3 className="font-medium text-gray-900 mb-2">Spec-vs-Work Drift Caught Early. </h3>
                
              </div>
            </div>
            {/* Row 3 */}
            <div className="flex gap-8">
              <div className="bg-[#F7F1FF] p-6 rounded-lg shadow-sm border border-purple-300 w-1/2">
                <h3 className="font-medium text-gray-900 mb-2">Actions, not Homework </h3>
                
              </div>
              <div className="bg-[#F7F1FF] p-6 rounded-lg shadow-sm border border-purple-300 w-1/2">
                <h3 className="font-medium text-gray-900 mb-2">Post the Comment or Create the Task Right there.</h3>
                
              </div>
            </div>

            {/* Row 4 */}
            <div className="flex gap-8">
              <div className="bg-[#F7F1FF] p-6 rounded-lg shadow-sm border border-purple-300 w-1/2">
                <h3 className="font-medium text-gray-900 mb-2">Permission Aware </h3>
                
              </div>
              <div className="bg-[#F7F1FF] p-6 rounded-lg shadow-sm border border-purple-300 w-1/2">
                <h4 className="font-medium text-gray-900 mb-2">Sees What Your Account can see. No Surprises. </h4>
                
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Same Truth Section */}
      <section
        className="fade-in py-20 bg-gray-50 bg-no-repeat bg-center bg-contain"
        style={{ backgroundImage: "url('https://mcusercontent.com/7e625ac7d88971ac43e4120d8/images/60df1e1a-58f0-809b-a6c0-77a70f61a7f8.png')" }}
      >
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Same truth, different lens
          </h2>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-purple-300">
              <h3 className="font-semibold text-purple-600 mb-3">Product Manager</h3>
              <p className="text-gray-700">
                Status, Owner, ETA, Blockers. Fix Drift in One Click.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-purple-300">
              <h3 className="font-semibold text-purple-600 mb-3">Executive</h3>
              <p className="text-gray-700">
                Top risks by severity with owners, impact, and status.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-purple-300">
              <h3 className="font-semibold text-purple-600 mb-3">Support</h3>
              <p className="text-gray-700">
                Customer ETA with SLA risk flags you can send as a mental.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-purple-300">
              <h3 className="font-semibold text-purple-600 mb-3">Product Marketing Manager</h3>
              <p className="text-gray-700">
                Launch date, status since last week, link to the final source.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Works With Your Stack */}
      <section className="container mx-auto px-6 py-20 fade-in">
        <h2 className="text-center font-bold text-[#202020] text-[32px] mb-4">
          Works with your stack
        </h2>
        <p className="text-center text-[#202020] text-[16px] mb-12 ">
          Start with your core tools. Add more as you grow
        </p>

        <div className="flex justify-center gap-6 max-w-3xl mx-auto">
          {integrations.map((integration) => (
            <img
              key={integration.name}
              src={integration.url}
              alt={`${integration.name} logo`}
              className="w-20 h-20"
            />
          ))}
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 fade-in">
        <div className="container mx-auto px-6">
          <p className="text-center text-purple-600 font-semibold mb-2">Pricing</p>
          <h2 className="text-3xl  font-bold text-center text-gray-900 mb-4">
            Choose speed or scale
          </h2>
          <br /><br />
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Basic Plan */}
            <div
              className={`bg-white rounded-xl p-8 cursor-pointer transition-all border border-gray-200 ${selectedPlan === 'basic' ? 'ring-2 ring-[#7F56D9] shadow-lg' : 'shadow-md'
                }`}
              onClick={() => setSelectedPlan('basic')}
            >
              <div className="flex flex-col items-start">
                <div className="p-3 bg-purple-100 rounded-full mb-4">
                  <Sparkles size={24} className="text-purple-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-1">Basic</h3>
                <p className="text-sm text-gray-600 mb-6">Free forever.</p>
              </div>

              <p className="text-lg text-gray-900 font-semibold mb-4">Plan features:</p>
              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-2">
                  <Check size={20} className="text-green-500 mt-0.5" />
                  <span className="text-gray-700">100 queries per user / month</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check size={20} className="text-green-500 mt-0.5" />
                  <span className="text-gray-700">Summaries only</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check size={20} className="text-green-500 mt-0.5" />
                  <span className="text-gray-700">2 integrations</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check size={20} className="text-green-500 mt-0.5" />
                  <span className="text-gray-700">Export PDF Only</span>
                </li>
              </ul>
                <Link href="/signup">
              <button  className="w-full py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                Start Free
              </button>
              </Link>
            </div>

            {/* Business Plan */}
            <div
              className={`bg-[#F7F1FF] rounded-2xl p-8 cursor-pointer transition-all border border-[#823BE3] ${selectedPlan === 'business' ? 'ring-2 ring-[#7F56D9] shadow-lg' : 'shadow-md'
                }`}
              onClick={() => setSelectedPlan('business')}
            >
              <div className="flex flex-col items-start">
                <div className="p-3 bg-[#823BE3] rounded-[12px] mb-4">
                  <Rocket size={24} className="text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-1">Business</h3>
                <p className="text-sm text-gray-600 mb-6">$99/month</p>
              </div>

              <p className="text-lg text-gray-900 font-semibold mb-4">Plan features:</p>
              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-2">
                  <Check size={20} className="text-green-500 mt-0.5" />
                  <span className="text-gray-700">Unlimited queries</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check size={20} className="text-green-500 mt-0.5" />
                  <span className="text-gray-700">Advanced insights (risks, blockers, dependencies, trends)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check size={20} className="text-green-500 mt-0.5" />
                  <span className="text-gray-700">Unlimited integrations</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check size={20} className="text-green-500 mt-0.5" />
                  <span className="text-gray-700">Agents (scheduled + custom)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check size={20} className="text-green-500 mt-0.5" />
                  <span className="text-gray-700">Export & share: PDF, Word, links, dashboards</span>
                </li>
              </ul>
              <Link href="mailto:sales@knowva.com">
              <button  className="w-full py-3 bg-[#7F56D9] text-white rounded-lg hover:bg-purple-700">
               Talk to Sales
                
              </button>
              </Link>
            </div>
          </div>

          <p className="text-center text-gray-500 text-sm mt-8">
            Your data stays yours. We don't train public models on it.
          </p>
        </div>
      </section>

      {/* Decision Time Section */}
      <section className="container mx-auto px-6 py-20 text-center fade-in">
        <h2 className="text-[#202020] text-4xl font-semibold mb-4 leading-[64px] font-['DM_Sans']">
          Decision Time
        </h2>
        <p className="text-gray-900 text-base font-medium mb-8 leading-6 font-['Inter']">
          Ready to stop chasing links?
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/signup" className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700">
            Start Free
          </Link>
          <Link href="mailto:sales@knowva.com" className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50">
            Book a 15-min pilot
          </Link>
        </div>
        <p className="mt-6 text-sm italic text-gray-700 leading-5 font-['Inter']">
          No credit card. Keep your permissions.
        </p>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-8 bg-[#F4EEFD] fade-in">
        <div className="container mx-auto px-6 text-center">
          <p className="text-sm text-[#823BE3] font-bold">
            Created by Team Rogue
          </p>
        </div>
      </footer>


    </div>
  );
}