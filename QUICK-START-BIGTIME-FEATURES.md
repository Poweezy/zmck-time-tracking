# Quick Start Guide - BigTime Features

This guide will help you quickly get started with the new BigTime-inspired features in the ZMCK application.

## 🚀 Setup

### 1. Run Database Migrations

First, apply the new database migrations:

```bash
cd backend
npm run migrate
```

This creates the following tables:
- `expenses` - Expense tracking
- `task_dependencies` - Task dependency relationships
- `milestones` - Project milestones
- `invoices` - Invoice management
- `invoice_items` - Invoice line items

### 2. Start the Application

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

---

## 📖 Feature Guides

### 💰 Expense Tracking

**Location**: Expenses page (Admin/Supervisor menu)

**How to Use**:
1. Click "New Expense" button
2. Fill in the form:
   - Select project (required)
   - Select task (optional)
   - Enter amount (required)
   - Choose category (Travel, Materials, Equipment, Other)
   - Set expense date
   - Add description
   - Upload receipt (optional - JPEG, PNG, PDF)
3. Submit for approval

**For Supervisors**:
- View all expenses in the Expenses page
- Approve or reject expenses
- View receipt attachments
- Filter by status, category, project

**API Endpoints**:
- `GET /api/expenses` - List expenses
- `POST /api/expenses` - Create expense
- `PUT /api/expenses/:id/approve` - Approve expense
- `PUT /api/expenses/:id/reject` - Reject expense

---

### 🧾 Invoicing

**Location**: Invoices page (Admin/Supervisor menu)

**How to Create an Invoice**:
1. Click "New Invoice" button
2. Select a project
3. Choose approved time entries to include
4. Choose approved expenses to include
5. Set invoice date and due date
6. Set tax rate (optional)
7. Add notes (optional)
8. Review totals and create

**Invoice Statuses**:
- **Draft**: Created but not sent
- **Sent**: Invoice has been sent to client
- **Paid**: Invoice has been paid
- **Overdue**: Past due date and not paid
- **Cancelled**: Invoice cancelled

**Actions**:
- **Send**: Mark invoice as sent
- **Mark Paid**: Record payment
- **Print**: Generate printable invoice
- **View**: See detailed invoice with line items

**API Endpoints**:
- `GET /api/invoices` - List invoices
- `POST /api/invoices` - Create invoice
- `PUT /api/invoices/:id/send` - Send invoice
- `PUT /api/invoices/:id/mark-paid` - Mark as paid

---

### 💵 Budget Tracking

**Location**: Budget page (Admin/Supervisor menu)

**Features**:
- View budget vs actual for all projects
- See cost variance (amount and percentage)
- See hours variance
- Visual charts showing budget vs actual
- Project detail breakdowns

**Understanding the Data**:
- **Budget**: Set budget amount on project
- **Actual**: Calculated from approved time entries (hours × rate) + approved expenses
- **Variance**: Difference between budget and actual
- **Status Indicators**:
  - 🟢 **On Track**: Within 5% of budget
  - 🟠 **Warning**: 5-10% over budget
  - 🔴 **Over Budget**: More than 10% over budget

**Click on a project** to see detailed breakdown:
- Time costs vs expense costs
- Hours variance
- Cost variance with percentages

**API Endpoints**:
- `GET /api/budget/all` - Get budget data for all projects
- `GET /api/budget/project/:projectId` - Get budget for specific project

---

### 🎯 Project Milestones

**Location**: Can be added to project detail pages

**How to Use**:
1. Create milestone via API or add to project page
2. Set target date
3. Track progress
4. Mark as complete when done

**Milestone Statuses**:
- **Upcoming**: Target date in the future
- **In Progress**: Currently working on it
- **Completed**: Milestone achieved
- **Overdue**: Past target date, not completed

**API Endpoints**:
- `GET /api/milestones?projectId=X` - List milestones
- `POST /api/milestones` - Create milestone
- `PUT /api/milestones/:id/complete` - Mark complete
- `DELETE /api/milestones/:id` - Delete milestone

---

### 🔗 Task Dependencies

**Location**: Can be integrated into task management

**Dependency Types**:
- **Finish-to-Start**: Task B can't start until Task A finishes
- **Start-to-Start**: Task B starts when Task A starts
- **Finish-to-Finish**: Task B finishes when Task A finishes
- **Start-to-Finish**: Task B finishes when Task A starts

**API Endpoints**:
- `GET /api/task-dependencies?taskId=X` - Get dependencies
- `POST /api/task-dependencies` - Create dependency
- `DELETE /api/task-dependencies/:id` - Remove dependency

---

## 🔑 Key Concepts

### Expense Approval Workflow
1. Engineer creates expense → **Pending**
2. Supervisor reviews → **Approved** or **Rejected**
3. Approved expenses can be included in invoices
4. Rejected expenses require changes

### Invoice Generation
- Only **approved** time entries and expenses can be invoiced
- Invoices automatically calculate:
  - Subtotal (time + expenses)
  - Tax (if applicable)
  - Total amount
- Each invoice gets a unique number: `INV-YYYY-####`

### Budget Tracking
- Budget is set on project creation/edit
- Actual costs are calculated from:
  - Time entries: `hours × hourly_rate`
  - Expenses: `sum of approved expenses`
- Variance shows if project is over/under budget

---

## 📊 Dashboard Overview

The Budget page provides:
- **Summary Cards**: Total budget, actual, variance, project count
- **Chart**: Visual comparison of budget vs actual by project
- **Table**: Detailed view with variance indicators
- **Detail Modal**: Click project for breakdown

---

## 🎨 UI Features

All new pages include:
- ✅ Dark mode support
- ✅ Responsive design
- ✅ Loading states
- ✅ Empty states
- ✅ Error handling
- ✅ Search and filtering
- ✅ Print functionality (invoices)

---

## 🐛 Troubleshooting

### Expenses not showing?
- Check if user has proper role (admin/supervisor can see all, engineers see only their own)
- Verify expense approval status filter

### Invoice creation fails?
- Ensure time entries and expenses are **approved**
- Check that project has approved items
- Verify project ID is correct

### Budget shows zero?
- Set budget amount on project
- Ensure time entries are approved (they're included in actual costs)
- Check that users have hourly rates set

### Milestones not updating status?
- Status updates automatically based on target date
- Refresh page to see updated statuses

---

## 📚 Additional Resources

- **Full Documentation**: See `BIGTIME-FEATURES-IMPLEMENTED.md`
- **Implementation Details**: See `IMPLEMENTATION-COMPLETE.md`
- **API Documentation**: Visit `/api-docs` when backend is running

---

## 💡 Tips

1. **Set Budgets Early**: Set budget amounts when creating projects for better tracking
2. **Approve Promptly**: Quick approval of time entries and expenses enables faster invoicing
3. **Use Categories**: Categorize expenses for better reporting
4. **Track Milestones**: Set realistic target dates and update status regularly
5. **Monitor Budget**: Check budget page regularly to catch overruns early

---

*Happy tracking! 🎉*

