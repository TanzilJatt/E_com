"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreVertical, Pencil, Trash2 } from "lucide-react"
import { useCurrentUser } from "@/components/auth-guard"
import { AddStaffDialog, DeleteStaffDialog, EditStaffDialog } from "@/components/staff-dialogs"
import { getStaffMembers, type UserProfile } from "@/lib/users"
import { getStaffStock, type StaffStock } from "@/lib/staff-stock"
import { toast } from "sonner"

export default function UsersPage() {
  const router = useRouter()
  const { ownerId } = useCurrentUser()
  const [staff, setStaff] = useState<UserProfile[]>([])
  const [stock, setStock] = useState<StaffStock[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [editing, setEditing] = useState<UserProfile | null>(null)
  const [deleting, setDeleting] = useState<UserProfile | null>(null)

  const fetchData = async () => {
    if (!ownerId) return
    try {
      const [staffList, stockList] = await Promise.all([getStaffMembers(ownerId), getStaffStock({ adminId: ownerId })])
      setStaff(staffList)
      setStock(stockList)
    } catch (error: any) {
      console.error("Error loading users:", error)
      toast.error(error.message || "Failed to load users")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [ownerId])

  const boxesFor = (staffId: string) =>
    stock.filter((s) => s.staffId === staffId).reduce((sum, s) => sum + Math.max(s.quantity, 0), 0)

  const term = searchTerm.toLowerCase()
  const filteredStaff = staff.filter((s) => s.name.toLowerCase().includes(term) || s.email.toLowerCase().includes(term))

  const openStaff = (member: UserProfile) => router.push(`/users/${member.id}`)

  const renderActions = (member: UserProfile) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0"
          aria-label={`Actions for ${member.name}`}
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onSelect={() => setEditing(member)}>
          <Pencil />
          Edit
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(member)}>
          <Trash2 />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  const statusBadge = (member: UserProfile) =>
    member.active ? <Badge variant="secondary">Active</Badge> : <Badge variant="destructive">Disabled</Badge>

  return (
    <>
      <Navbar />
      <div className="md:pl-64">
        <main className="w-full px-4 sm:px-6 lg:px-10 py-4 sm:py-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6 sm:mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Users</h1>
              <p className="text-muted-foreground mt-1 sm:mt-2 text-sm sm:text-base">
                Your shop staff. Click a staff member to manage their stock, password and records.
              </p>
            </div>
            <Button onClick={() => setIsAddOpen(true)} className="w-full sm:w-auto">
              + Add Staff
            </Button>
          </div>

          <div className="mb-4">
            <Input
              type="text"
              placeholder="Search name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 w-full sm:w-64 text-sm"
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center min-h-[200px]">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : filteredStaff.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              {staff.length === 0
                ? 'No staff yet. Click "+ Add Staff" to create a login for someone on your team.'
                : "No staff match your search."}
            </Card>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="md:hidden space-y-3">
                {filteredStaff.map((member) => (
                  <Card key={member.id} className="p-4 cursor-pointer" onClick={() => openStaff(member)}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold truncate">{member.name}</span>
                          {statusBadge(member)}
                        </div>
                        <div className="text-sm text-muted-foreground truncate">{member.email}</div>
                        <div className="text-sm mt-1">
                          Stock: <span className="font-semibold">{boxesFor(member.id)} boxes</span>
                        </div>
                      </div>
                      {renderActions(member)}
                    </div>
                  </Card>
                ))}
              </div>

              {/* Desktop table */}
              <Card className="hidden md:block overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-semibold">Name</th>
                      <th className="text-left py-3 px-4 font-semibold">Email</th>
                      <th className="text-left py-3 px-4 font-semibold">Status</th>
                      <th className="text-right py-3 px-4 font-semibold">Stock in Hand</th>
                      <th className="py-3 px-4 w-20"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStaff.map((member, index) => (
                      <tr
                        key={member.id}
                        onClick={() => openStaff(member)}
                        className={`border-b border-border last:border-0 cursor-pointer hover:bg-muted/40 transition-colors ${
                          index % 2 === 0 ? "bg-background" : "bg-muted/10"
                        }`}
                      >
                        <td className="py-3 px-4 font-medium">{member.name}</td>
                        <td className="py-3 px-4 text-muted-foreground">{member.email}</td>
                        <td className="py-3 px-4">{statusBadge(member)}</td>
                        <td className="py-3 px-4 text-right font-semibold">{boxesFor(member.id)} boxes</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end gap-1">
                            {renderActions(member)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </>
          )}

          <AddStaffDialog open={isAddOpen} onOpenChange={setIsAddOpen} onCreated={fetchData} />
          <EditStaffDialog staff={editing} onClose={() => setEditing(null)} onSaved={fetchData} />
          <DeleteStaffDialog staff={deleting} onClose={() => setDeleting(null)} onDeleted={fetchData} />
        </main>
      </div>
    </>
  )
}
