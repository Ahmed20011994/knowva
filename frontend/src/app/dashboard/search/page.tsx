"use client";

import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import CitationTag from "@/components/CitationTag";
import ResultCard from "@/components/ResultCard";
import InsightCard from "@/components/InsightCard";

export default function SearchResultsPage() {
  // Simulated state
  const [query] = useState("How to deploy Next.js on Azure?");
  const [filter, setFilter] = useState<string>("all");

  // Mock results (you’ll fetch from API later)
  const results = [
    {
      title: "Jira Ticket #1023",
      snippet: "Deployment guide for Next.js app on Azure App Service.",
      source: "Jira",
      link: "#",
    },
    {
      title: "Confluence Doc: Azure Deployment",
      snippet: "Step-by-step documentation for setting up Azure pipelines.",
      source: "Confluence",
      link: "#",
    },
    {
      title: "Zendesk Ticket #554",
      snippet: "Troubleshooting 504 errors during Next.js deployment.",
      source: "Zendesk",
      link: "#",
    },
  ];

  const filteredResults =
    filter === "all"
      ? results
      : results.filter((r) => r.source.toLowerCase() === filter.toLowerCase());

  return (
    <DashboardLayout>
      {/* Query at top */}
      <h1 className="text-xl font-bold mb-2 text-gray-800">
        Results for: <span className="text-blue-600">{query}</span>
      </h1>

      {/* AI Answer Section */}
      <section className="p-4 mb-6 bg-white rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-2 text-gray-700">AI Answer</h2>
        <p className="text-gray-600">
          To deploy a Next.js app on Azure App Service, configure your{" "}
          <code>next.config.js</code> for production, create a build pipeline
          in Azure DevOps, and set environment variables properly.
        </p>

        <div className="mt-3 space-x-2">
          <CitationTag label="[1] Jira Guide" href="#" />
          <CitationTag label="[2] Confluence Doc" href="#" />
        </div>
      </section>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {["all", "jira", "confluence", "zendesk"].map((src) => (
          <button
            key={src}
            onClick={() => setFilter(src)}
            className={`px-3 py-1 rounded-lg text-sm font-medium border transition ${
              filter === src
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-600 border-gray-300 hover:bg-gray-100"
            }`}
          >
            {src.charAt(0).toUpperCase() + src.slice(1)}
          </button>
        ))}
      </div>

      {/* Results List */}
      <section className="space-y-4">
        {filteredResults.length > 0 ? (
          filteredResults.map((r, idx) => (
            <ResultCard
              key={idx}
              title={r.title}
              snippet={r.snippet}
              source={r.source}
              link={r.link}
            />
          ))
        ) : (
          <InsightCard message="No results found for this filter." />
        )}
      </section>
    </DashboardLayout>
  );
}
