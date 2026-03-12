import { useState } from "react";
import { Plus, Play, Pause, Square, MoreHorizontal, Send, Clock, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface Campaign {
  id: number;
  name: string;
  status: "Running" | "Paused" | "Draft" | "Completed";
  contacts: number;
  sent: number;
  replies: number;
  replyRate: number;
  steps: number;
  currentStep: string;
}

const mockCampaigns: Campaign[] = [
  { id: 1, name: "SaaS Outreach Q1", status: "Running", contacts: 1840, sent: 1240, replies: 89, replyRate: 7.2, steps: 5, currentStep: "Follow-up 2" },
  { id: 2, name: "Agency Lead Gen", status: "Running", contacts: 960, sent: 860, replies: 52, replyRate: 6.0, steps: 4, currentStep: "Follow-up 1" },
  { id: 3, name: "E-commerce Partners", status: "Paused", contacts: 720, sent: 540, replies: 41, replyRate: 7.6, steps: 5, currentStep: "Follow-up 3" },
  { id: 4, name: "Product Launch", status: "Draft", contacts: 0, sent: 0, replies: 0, replyRate: 0, steps: 5, currentStep: "Not started" },
];

const statusColors: Record<string, string> = {
  Running: "bg-success/10 text-success",
  Paused: "bg-warning/10 text-warning",
  Draft: "bg-muted text-muted-foreground",
  Completed: "bg-info/10 text-info",
};

const Campaigns = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Campaigns</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your email sequences</p>
        </div>
        <Button size="sm"><Plus className="w-4 h-4 mr-2" />New Campaign</Button>
      </div>

      <div className="grid gap-4">
        {mockCampaigns.map((campaign, i) => (
          <motion.div
            key={campaign.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="stat-card !p-5"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="font-display font-semibold text-foreground">{campaign.name}</h3>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[campaign.status]}`}>
                      {campaign.status}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {campaign.steps} steps · Current: {campaign.currentStep}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Contacts</p>
                  <p className="text-sm font-semibold text-foreground">{campaign.contacts.toLocaleString()}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Sent</p>
                  <p className="text-sm font-semibold text-foreground">{campaign.sent.toLocaleString()}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Replies</p>
                  <p className="text-sm font-semibold text-foreground">{campaign.replies}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Rate</p>
                  <p className="text-sm font-semibold text-success">{campaign.replyRate}%</p>
                </div>

                <div className="flex items-center gap-1 ml-4">
                  {campaign.status === "Running" && (
                    <button className="p-2 rounded-lg hover:bg-muted transition-colors" title="Pause">
                      <Pause className="w-4 h-4 text-muted-foreground" />
                    </button>
                  )}
                  {(campaign.status === "Paused" || campaign.status === "Draft") && (
                    <button className="p-2 rounded-lg hover:bg-muted transition-colors" title="Start">
                      <Play className="w-4 h-4 text-muted-foreground" />
                    </button>
                  )}
                  {campaign.status !== "Draft" && (
                    <button className="p-2 rounded-lg hover:bg-muted transition-colors" title="Stop">
                      <Square className="w-4 h-4 text-muted-foreground" />
                    </button>
                  )}
                  <button className="p-2 rounded-lg hover:bg-muted transition-colors">
                    <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              </div>
            </div>

            {campaign.status === "Running" && (
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex gap-2">
                  {Array.from({ length: campaign.steps }).map((_, si) => (
                    <div
                      key={si}
                      className={`flex-1 h-1.5 rounded-full ${
                        si < 3 ? "bg-primary" : si === 3 ? "bg-primary/40" : "bg-muted"
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default Campaigns;
