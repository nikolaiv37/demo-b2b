// This page saves hours of WhatsApp chaos every week
import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { GlassCard } from '@/components/GlassCard'
import { MyComplaintsTab } from './MyComplaintsTab'
import { NewComplaintTab } from './NewComplaintTab'

export function ComplaintsPage() {
  const [activeTab, setActiveTab] = useState('my-complaints')
  const [refreshKey, setRefreshKey] = useState(0)

  const handleComplaintSubmitted = () => {
    setActiveTab('my-complaints')
    setRefreshKey((prev) => prev + 1)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Complaints & Returns</h1>
        <p className="text-muted-foreground">
          Report issues with your orders and request returns or replacements
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="glass">
          <TabsTrigger value="my-complaints">
            My Complaints
          </TabsTrigger>
          <TabsTrigger value="new-complaint">
            New Complaint
          </TabsTrigger>
        </TabsList>

        <TabsContent value="my-complaints">
          <MyComplaintsTab key={refreshKey} />
        </TabsContent>

        <TabsContent value="new-complaint">
          <NewComplaintTab onSubmitted={handleComplaintSubmitted} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

