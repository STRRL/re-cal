"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast, Toaster } from "sonner"
import { Calendar, Copy, Mail, Apple } from "lucide-react"
import { format, addWeeks, addMonths, addYears } from "date-fns"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import WheelPicker from "@/components/ui/wheel-picker"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form"

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().optional(),
  timeDelay: z.string(),
})

type FormData = z.infer<typeof formSchema>

export default function Home() {
  const [selectedNumber, setSelectedNumber] = useState(1)
  const [selectedUnit, setSelectedUnit] = useState("weeks")
  const [recentDelays, setRecentDelays] = useState<string[]>([])

  const LAST_KEY = "recal:lastTimeDelay"
  const RECENTS_KEY = "recal:recentTimeDelays"
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      content: "",
      timeDelay: "1weeks",
    },
  })

  const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9]
  const units = [
    { label: "weeks", value: "weeks", fn: (num: number) => addWeeks(new Date(), num) },
    { label: "months", value: "months", fn: (num: number) => addMonths(new Date(), num) },
    { label: "years", value: "years", fn: (num: number) => addYears(new Date(), num) },
  ]

  const updateTimeDelay = (number: number, unit: string) => {
    form.setValue("timeDelay", `${number}${unit}`)
  }

  const parseTimeDelay = (td: string): { number: number; unit: string } => {
    const m = td.match(/(\d+)(\w+)/)
    const number = m ? parseInt(m[1]) : 1
    const unit = m ? m[2] : "weeks"
    return { number, unit }
  }

  // Load last selection and recents on mount
  useEffect(() => {
    if (typeof window === "undefined") return
    const last = window.localStorage.getItem(LAST_KEY)
    if (last) {
      const { number, unit } = parseTimeDelay(last)
      setSelectedNumber(number)
      setSelectedUnit(unit)
      updateTimeDelay(number, unit)
    } else {
      updateTimeDelay(selectedNumber, selectedUnit)
    }

    const savedRecents = window.localStorage.getItem(RECENTS_KEY)
    if (savedRecents) {
      try {
        const arr = JSON.parse(savedRecents)
        if (Array.isArray(arr)) setRecentDelays(arr.slice(0, 3))
      } catch {}
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update last selection whenever wheels or quick picks change
  useEffect(() => {
    if (typeof window === "undefined") return
    const td = `${selectedNumber}${selectedUnit}`
    window.localStorage.setItem(LAST_KEY, td)
  }, [selectedNumber, selectedUnit])


  const getEventDates = (data: FormData) => {
    // Parse the time delay (e.g., "3weeks", "2months")
    const match = data.timeDelay.match(/(\d+)(\w+)/)
    const number = match ? parseInt(match[1]) : 1
    const unit = match ? match[2] : "weeks"
    
    const selectedUnit = units.find(u => u.value === unit)
    const startDate = selectedUnit ? selectedUnit.fn(number) : addWeeks(new Date(), 1)
    const endDate = new Date(startDate.getTime() + 30 * 60000) // 30 minutes duration
    
    return { startDate, endDate }
  }

  const generateICS = (data: FormData) => {
    const now = new Date()
    const uid = `${Date.now()}@recal.app`
    const dtstamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")
    
    const { startDate, endDate } = getEventDates(data)
    
    const formatDate = (date: Date) => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, "0")
      const day = String(date.getDate()).padStart(2, "0")
      const hours = String(date.getHours()).padStart(2, "0")
      const minutes = String(date.getMinutes()).padStart(2, "0")
      const seconds = String(date.getSeconds()).padStart(2, "0")
      return `${year}${month}${day}T${hours}${minutes}${seconds}`
    }
    
    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//ReCal//ReCal 1.0//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART:${formatDate(startDate)}`,
      `DTEND:${formatDate(endDate)}`,
      `SUMMARY:${data.title}`,
      `DESCRIPTION:${(data.content || "").replace(/\n/g, "\\n")}`,
      "END:VEVENT",
      "END:VCALENDAR"
    ]
    
    return icsContent.join("\r\n")
  }

  const downloadICS = (data: FormData) => {
    const icsContent = generateICS(data)
    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `recal-${data.title.toLowerCase().slice(0, 30).replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}.ics`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    toast.success("Calendar file downloaded! Works with Apple Calendar, Outlook desktop, and other calendar apps.")
    updateRecents(data.timeDelay)
  }

  const addToGoogleCalendar = (data: FormData) => {
    const { startDate, endDate } = getEventDates(data)
    
    // Format dates for Google Calendar (YYYYMMDDTHHmmssZ)
    const formatGoogleDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")
    }
    
    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: data.title,
      dates: `${formatGoogleDate(startDate)}/${formatGoogleDate(endDate)}`,
      details: data.content || "",
      trp: "false"
    })
    
    const url = `https://calendar.google.com/calendar/render?${params.toString()}`
    window.open(url, "_blank")
    toast.success("Opening Google Calendar...")
    updateRecents(data.timeDelay)
  }

  const addToOutlook = (data: FormData) => {
    const { startDate, endDate } = getEventDates(data)
    
    // Format dates for Outlook (YYYY-MM-DDTHH:MM:SS)
    const formatOutlookDate = (date: Date) => {
      return date.toISOString().slice(0, 19)
    }
    
    const params = new URLSearchParams({
      path: "/calendar/action/compose",
      rru: "addevent",
      startdt: formatOutlookDate(startDate),
      enddt: formatOutlookDate(endDate),
      subject: data.title,
      body: data.content || "",
    })
    
    // Try both Outlook Live and Office 365 URLs
    const urls = [
      `https://outlook.live.com/calendar/deeplink/compose?${params.toString()}`,
      `https://outlook.office.com/calendar/deeplink/compose?${params.toString()}`
    ]
    
    // Open Outlook Live by default, but provide option for Office 365
    window.open(urls[0], "_blank")
    toast.success("Opening Outlook Calendar...")
    updateRecents(data.timeDelay)
  }


  const copyEventDetails = (data: FormData) => {
    const { startDate } = getEventDates(data)
    
    const eventText = `📅 ${data.title}
🗓️ ${format(startDate, "PPP 'at' p")}
⏱️ Duration: 30 minutes
${data.content ? `\n📝 ${data.content}` : ""}`
    
    navigator.clipboard.writeText(eventText).then(() => {
      toast.success("Event details copied to clipboard!")
    }).catch(() => {
      toast.error("Failed to copy to clipboard")
    })
    updateRecents(data.timeDelay)
  }

  const updateRecents = (timeDelay: string) => {
    // Update recents with the latest distinct choice (keep last 3)
    setRecentDelays((prev) => {
      const next = [timeDelay, ...prev.filter((v) => v !== timeDelay)].slice(0, 3)
      if (typeof window !== "undefined") {
        window.localStorage.setItem(RECENTS_KEY, JSON.stringify(next))
      }
      return next
    })
  }

  const onSubmit = (data: FormData) => {
    // Default action - download ICS
    downloadICS(data)
  }

  const scrollToGenerator = () => {
    document.getElementById("generator")?.scrollIntoView({ behavior: "smooth" })
  }

  return (
    <>
      <Toaster position="bottom-center" />
      <div className="min-h-screen bg-white">
        {/* Header */}
        <header className="border-b">
          <div className="mx-auto max-w-5xl px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold">ReCal</h1>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={scrollToGenerator}
            >
              Create Reminder
            </Button>
          </div>
        </header>

        {/* Main two-column layout */}
        <section className="mx-auto max-w-5xl px-4 py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            {/* Left: Hero copy */}
            <div className="text-left">
              <h2 className="text-4xl md:text-5xl font-bold mb-3 leading-tight">
                Capture a thought now.
                <br className="hidden md:block" />
                Revisit it when it matters.
              </h2>
              <p className="text-base md:text-lg text-gray-600 mb-2 md:mb-4 max-w-xl">
                Turn your hot takes, fact checks, and second thoughts into calendar reminders.
                Because some perspectives need time to mature.
              </p>
            </div>

            {/* Right: Generator Card */}
            <section id="generator" className="w-full max-w-md md:justify-self-end">
              <Card className="rounded-xl shadow-lg">
                <CardHeader className="pb-3">
                  <CardTitle>Create Your Reminder</CardTitle>
                  <CardDescription>
                    What do you want to revisit, and when?
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
                    {/* Title Field */}
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              placeholder="Title, e.g., Revisit this decision"
                              className="text-base"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Content Field */}
                    <FormField
                      control={form.control}
                      name="content"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Textarea
                              placeholder={"Content or context, e.g.:\n- Capture current thoughts and reasons\n- Hypotheses/checklist to validate\n- Links to sources to revisit"}
                              rows={5}
                              className="resize-none text-base"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Time Selection */}
                    <div className="space-y-3">
                      <p className="text-base font-semibold">Remind me...</p>
                      
                      <div className="border rounded-lg p-4 bg-white">
                        <div className="flex flex-col gap-6">
                          {/* iOS-style wheel pickers */}
                          <div className="flex gap-4 justify-between">
                            <div className="flex-1">
                              <p className="text-xs text-gray-500 mb-2">How many</p>
                              <WheelPicker
                                options={numbers.map((n) => ({ label: String(n), value: n }))}
                                selectedIndex={numbers.indexOf(selectedNumber)}
                                onChange={(idx) => {
                                  const num = numbers[idx] ?? 1
                                  setSelectedNumber(num)
                                  updateTimeDelay(num, selectedUnit)
                                }}
                                itemHeight={32}
                                visibleCount={3}
                              />
                            </div>
                            <div className="flex-1">
                              <p className="text-xs text-gray-500 mb-2">Time unit</p>
                              <WheelPicker
                                options={units.map((u) => ({ label: u.label, value: u.value }))}
                                selectedIndex={units.findIndex((u) => u.value === selectedUnit)}
                                onChange={(idx) => {
                                  const u = units[idx] ?? units[0]
                                  setSelectedUnit(u.value)
                                  updateTimeDelay(selectedNumber, u.value)
                                }}
                                itemHeight={32}
                                visibleCount={3}
                              />
                            </div>
                          </div>
                          
                          {/* Current Selection */}
                          <div className="mt-1 pt-2 border-t text-center">
                            <span className="text-lg font-medium">
                              {selectedNumber} {selectedUnit} later
                            </span>
                          </div>

                          {/* Recent quick picks */}
                          {recentDelays.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs text-gray-500 mb-2">Recent picks</p>
                              <div className="flex flex-wrap gap-2">
                                {recentDelays.map((td) => {
                                  const { number, unit } = parseTimeDelay(td)
                                  const label = `${number} ${unit}`
                                  return (
                                    <Button
                                      key={td}
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setSelectedNumber(number)
                                        setSelectedUnit(unit)
                                        updateTimeDelay(number, unit)
                                      }}
                                    >
                                      {label}
                                    </Button>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>


                    {/* Calendar Integration Options */}
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-gray-700">Add to calendar:</p>
                      
                      <div className="space-y-2">
                        {/* Online calendars */}
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => form.handleSubmit(addToGoogleCalendar)()}
                            className="justify-start"
                          >
                            <Calendar className="mr-2 h-4 w-4 text-blue-600" />
                            Google Calendar
                          </Button>
                          
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => form.handleSubmit(addToOutlook)()}
                            className="justify-start"
                          >
                            <Mail className="mr-2 h-4 w-4 text-blue-500" />
                            Outlook Web
                          </Button>
                        </div>
                        
                        {/* Universal options */}
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            type="submit"
                            variant="outline"
                            size="sm"
                            className="justify-start"
                          >
                            <Apple className="mr-2 h-4 w-4" />
                            iCal / .ics file
                          </Button>
                          
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => form.handleSubmit(copyEventDetails)()}
                            className="justify-start"
                          >
                            <Copy className="mr-2 h-4 w-4" />
                            Copy Details
                          </Button>
                        </div>
                      </div>
                      
                      <p className="text-xs text-gray-500">
                        .ics file works with Apple Calendar, Outlook desktop, and most calendar apps
                      </p>
                    </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </section>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t mt-4">
          <div className="container mx-auto px-4 py-6 text-center text-sm text-gray-600">
            © {new Date().getFullYear()} ReCal. Helping you think twice.
          </div>
        </footer>
      </div>
    </>
  )
}
