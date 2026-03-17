import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Globe } from "lucide-react";

const TIMEZONES = [
  { value: "UTC", label: "UTC (GMT+0)" },
  { value: "America/New_York", label: "Eastern (GMT-5)" },
  { value: "America/Chicago", label: "Central (GMT-6)" },
  { value: "America/Denver", label: "Mountain (GMT-7)" },
  { value: "America/Los_Angeles", label: "Pacific (GMT-8)" },
  { value: "Europe/London", label: "London (GMT+0)" },
  { value: "Europe/Paris", label: "Paris (GMT+1)" },
  { value: "Europe/Berlin", label: "Berlin (GMT+1)" },
  { value: "Asia/Dubai", label: "Dubai (GMT+4)" },
  { value: "Asia/Kolkata", label: "India (GMT+5:30)" },
  { value: "Asia/Shanghai", label: "China (GMT+8)" },
  { value: "Asia/Tokyo", label: "Tokyo (GMT+9)" },
  { value: "Australia/Sydney", label: "Sydney (GMT+11)" },
  { value: "Pacific/Auckland", label: "Auckland (GMT+12)" },
  { value: "Asia/Karachi", label: "Pakistan (GMT+5)" },
  { value: "Asia/Jakarta", label: "Jakarta (GMT+7)" },
  { value: "Asia/Singapore", label: "Singapore (GMT+8)" },
  { value: "America/Sao_Paulo", label: "São Paulo (GMT-3)" },
  { value: "Africa/Lagos", label: "Lagos (GMT+1)" },
  { value: "Africa/Cairo", label: "Cairo (GMT+2)" },
];

interface TimezoneSelectorProps {
  value: string;
  onChange: (value: string) => void;
  compact?: boolean;
}

const TimezoneSelector = ({ value, onChange, compact = false }: TimezoneSelectorProps) => {
  if (compact) {
    return (
      <Select value={value || "UTC"} onValueChange={onChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {TIMEZONES.map(tz => (
            <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Globe className="w-4 h-4 text-primary" />
        <Label className="font-medium">Timezone</Label>
      </div>
      <Select value={value || "UTC"} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select timezone" />
        </SelectTrigger>
        <SelectContent>
          {TIMEZONES.map(tz => (
            <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-[11px] text-muted-foreground">
        Emails will be scheduled to arrive during business hours (9 AM - 6 PM) in this timezone.
      </p>
    </div>
  );
};

export default TimezoneSelector;
