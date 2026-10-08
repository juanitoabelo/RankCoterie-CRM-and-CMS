import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/directory/prismaCatalog";
import { format } from "date-fns";

export const revalidate = 0;

const SimpleLineChart = ({
  data,
  lines,
}: {
  data: { date: string; [key: string]: number }[];
  lines: { key: string; label: string; color: string }[];
}) => {
  if (!data.length) return <div className="h-full flex items-center justify-center text-zinc-500">No data</div>;

  const allValues = lines.flatMap((l) => data.map((d) => d[l.key] || 0));
  const maxValue = Math.max(...allValues);
  const minValue = Math.min(...allValues);
  const range = maxValue - minValue || 1;

  return (
    <svg viewBox="0 0 400 200" className="h-full w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="grid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e4e4e7" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#e4e4e7" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g>
        {lines.map((line, lineIndex) => (
          <polyline
            key={line.key}
            fill="none"
            stroke={line.color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={data
              .map((d, i) => {
                const x = (i / (data.length - 1)) * 360 + 20;
                const y = 180 - ((d[line.key] / range) * 160) + 10;
                return `${x},${y}`;
              })
              .join(" ")}
            />
          ))}
        <g fontSize="10" fill="#71717a">
          {data.map((d, i) => (
            <text key={d.date} x={(i / (data.length - 1)) * 360 + 20} y="205" textAnchor="middle" className="text-xs">
              {d.date}
            </text>
          ))}
        </g>
      </g>
    </svg>
  );
};

export default async function ListingAnalyticsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const listing = await prisma.listing.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      slug: true,
      tier: true,
      status: true,
      viewCount: true,
      clickCount: true,
      leadCount: true,
      createdAt: true,
      analytics: {
        orderBy: { date: "desc" },
        take: 90,
      },
      leads: {
        take: 20,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          subject: true,
          status: true,
          createdAt: true,
        },
      },
      reviews: {
        where: { status: "APPROVED" },
        select: {
          id: true,
          rating: true,
          title: true,
          content: true,
          authorName: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  if (!listing) notFound();

  const totalViews = listing.analytics.reduce((sum, a) => sum + a.views, 0);
  const totalClicks = listing.analytics.reduce((sum, a) => sum + a.clicks, 0);
  const totalLeads = listing.analytics.reduce((sum, a) => sum + a.leads, 0);
  const avgCtr = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(1) : "0";
  const avgConversion = totalViews > 0 ? ((totalLeads / totalViews) * 100).toFixed(1) : "0";

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentAnalytics = listing.analytics.filter((a) => a.date >= thirtyDaysAgo);
  const recentViews = recentAnalytics.reduce((sum, a) => sum + a.views, 0);
  const recentClicks = recentAnalytics.reduce((sum, a) => sum + a.clicks, 0);
  const recentLeads = recentAnalytics.reduce((sum, a) => sum + a.leads, 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link href="/admin/listings" className="text-blue-600 hover:underline text-sm mb-2 inline-block">
            ← Back to Listings
          </Link>
          <h1 className="text-2xl font-semibold text-zinc-900">
            Analytics: {listing.title}
          </h1>
          <p className="text-zinc-500 mt-1">Tracking performance since {format(listing.createdAt, "MMM d, yyyy")}</p>
        </div>
        <Link
          href={`/listing/${listing.slug}`}
          target="_blank"
          className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          View Public Listing →
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 mb-8">
        <StatCard label="Total Views" value={totalViews.toLocaleString()} change={`+${recentViews} (30d)`} />
        <StatCard label="Total Clicks" value={totalClicks.toLocaleString()} change={`+${recentClicks} (30d)`} />
        <StatCard label="CTR" value={`${avgCtr}%`} change={parseFloat(avgCtr) > 2 ? "Good" : "Needs improvement"} changeType={parseFloat(avgCtr) > 2 ? "positive" : "negative"} />
        <StatCard label="Total Leads" value={listing.leadCount.toLocaleString()} change={`+${recentLeads} (30d)`} />
        <StatCard label="Conversion" value={`${avgConversion}%`} change={parseFloat(avgConversion) > 1 ? "Good" : "Low"} changeType={parseFloat(avgConversion) > 1 ? "positive" : "negative"} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2 mb-8">
        <div className="rounded-xl border border-zinc-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-zinc-900 mb-4">Views & Clicks (Last 30 Days)</h3>
          <div className="h-64">
            <SimpleLineChart
              data={listing.analytics.slice(0, 30).reverse().map((a) => ({
                date: format(new Date(a.date), "MMM d"),
                views: a.views,
                clicks: a.clicks,
              }))}
              lines={[
                { key: "views", label: "Views", color: "hsl(220, 70%, 50%)" },
                { key: "clicks", label: "Clicks", color: "hsl(142, 70%, 50%)" },
              ]}
            />
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-zinc-900 mb-4">Leads Over Time</h3>
          <div className="h-64">
            <SimpleLineChart
              data={listing.analytics.slice(0, 30).reverse().map((a) => ({
                date: format(new Date(a.date), "MMM d"),
                leads: a.leads,
              }))}
              lines={[
                { key: "leads", label: "Leads", color: "hsl(262, 70%, 50%)" },
              ]}
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white mb-8">
        <div className="border-b border-zinc-200 px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-zinc-900">Recent Leads ({listing.leads.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 border-b border-zinc-200">
              <tr>
                <th className="p-3 text-left font-medium text-zinc-500">Date</th>
                <th className="p-3 text-left font-medium text-zinc-500">Name</th>
                <th className="p-3 text-left font-medium text-zinc-500">Email</th>
                <th className="p-3 text-left font-medium text-zinc-500">Subject</th>
                <th className="p-3 text-left font-medium text-zinc-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {listing.leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-zinc-50">
                  <td className="p-3 text-zinc-600">{format(new Date(lead.createdAt), "MMM d, yyyy")}</td>
                  <td className="p-3 font-medium text-zinc-900">{lead.name}</td>
                  <td className="p-3 text-zinc-600">{lead.email}</td>
                  <td className="p-3 text-zinc-600">{lead.subject || "General Inquiry"}</td>
                  <td className="p-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      lead.status === "NEW" ? "bg-blue-100 text-blue-700" :
                      lead.status === "CONTACTED" ? "bg-amber-100 text-amber-700" :
                      lead.status === "QUALIFIED" ? "bg-green-100 text-green-700" :
                      "bg-zinc-100 text-zinc-700"
                    }`}>
                      {lead.status}
                    </span>
                  </td>
                </tr>
              ))}
              {listing.leads.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-zinc-500">No leads yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white">
        <div className="border-b border-zinc-200 px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-zinc-900">Recent Reviews</h3>
        </div>
        <div className="p-6">
          {listing.reviews.length > 0 ? (
            <div className="space-y-4">
              {listing.reviews.map((review) => (
                <div key={review.id} className="border-t border-zinc-100 pt-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex items-center gap-1 text-amber-500">
                      {[...Array(5)].map((_, i) => (
                        <svg key={i} className={`h-4 w-4 ${i < review.rating ? "text-amber-500" : "text-zinc-200"}`} fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034a1 1 0 00-1.175 0l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.78-.57-.38-1.501.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" clipRule="evenodd" /></svg>
                      ))}
                    </div>
                    <span className="font-medium text-zinc-900">{review.authorName}</span>
                    <time className="text-sm text-zinc-500">{format(new Date(review.createdAt), "MMM d, yyyy")}</time>
                  </div>
                  {review.title && <h4 className="font-medium text-zinc-900 mb-1">{review.title}</h4>}
                  <p className="text-zinc-600">{review.content}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-zinc-500 text-center py-8">No reviews yet</p>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  change,
  changeType = "neutral",
}: {
  label: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-1 text-3xl font-semibold text-zinc-900">{value}</p>
      {change && (
        <p className={`mt-1 text-sm ${changeType === "positive" ? "text-green-600" : changeType === "negative" ? "text-red-600" : "text-zinc-500"}`}>
          {change}
        </p>
      )}
    </div>
  );
}
