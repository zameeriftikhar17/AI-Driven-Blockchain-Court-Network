import React,{useEffect,useState} from 'react';
import {motion} from 'framer-motion';
import {
FaPlus,
FaSearch,
FaEdit,
FaTrash,
FaEye,
FaUserTie,
FaToggleOn,
FaToggleOff
} from 'react-icons/fa';
import {ref,onValue,update,remove} from 'firebase/database';
import {useNavigate} from 'react-router-dom';
import {db} from '../../../firebase';
import Swal from 'sweetalert2';

const LawyerManagement=()=>{
const navigate=useNavigate();

const [lawyers,setLawyers]=useState([]);
const [loading,setLoading]=useState(true);
const [search,setSearch]=useState('');
const [statusFilter,setStatusFilter]=useState('All');
const [selected,setSelected]=useState(null);
const [showDetails,setShowDetails]=useState(false);

useEffect(()=>{
const usersRef=ref(db,'users');

const unsubscribe=onValue(usersRef,snapshot=>{
const data=snapshot.val();

if(!data){
setLawyers([]);
setLoading(false);
return;
}

const list=Object.keys(data)
.map(key=>({
id:key,
...data[key]
}))
.filter(user=>user.role==='lawyer')
.sort((a,b)=>
(b.createdAt||'').localeCompare(a.createdAt||'')
);

setLawyers(list);
setLoading(false);
},error=>{
console.error(error);
setLoading(false);
});

return()=>unsubscribe();
},[]);

const deleteLawyer=async lawyer=>{
const result=await Swal.fire({
icon:'warning',
title:'Delete Lawyer?',
html:`Are you sure you want to delete <strong>${lawyer.fullName}</strong>?`,
showCancelButton:true,
confirmButtonText:'Yes, Delete',
cancelButtonText:'Cancel',
confirmButtonColor:'#dc2626',
cancelButtonColor:'#64748b'
});

if(!result.isConfirmed)return;

try{
await remove(ref(db,`users/${lawyer.id}`));

Swal.fire({
icon:'success',
title:'Deleted',
text:'Lawyer record deleted successfully.',
timer:1800,
showConfirmButton:false
});
}catch(error){
Swal.fire({
icon:'error',
title:'Delete Failed',
text:error.message
});
}
};

const toggleStatus=async lawyer=>{
const newStatus=(lawyer.status||'Active')==='Active'
?'Inactive'
:'Active';

try{
await update(ref(db,`users/${lawyer.id}`),{
status:newStatus,
updatedAt:new Date().toISOString()
});

Swal.fire({
icon:'success',
title:`Lawyer ${newStatus}`,
text:`${lawyer.fullName} is now ${newStatus.toLowerCase()}.`,
timer:1500,
showConfirmButton:false
});
}catch(error){
Swal.fire({
icon:'error',
title:'Update Failed',
text:error.message
});
}
};

const filteredLawyers=lawyers.filter(lawyer=>{
const q=search.toLowerCase().trim();

const matchesSearch=
(lawyer.fullName||'').toLowerCase().includes(q)||
(lawyer.cnic||'').toLowerCase().includes(q)||
(lawyer.email||'').toLowerCase().includes(q)||
(lawyer.phone||'').toLowerCase().includes(q)||
(lawyer.licenseNumber||'').toLowerCase().includes(q)||
(lawyer.barAssociation||'').toLowerCase().includes(q)||
(lawyer.specialization||'').toLowerCase().includes(q);

const status=lawyer.status||'Active';

return matchesSearch&&(
statusFilter==='All'||status===statusFilter
);
});

const activeCount=lawyers.filter(
l=>(l.status||'Active')==='Active'
).length;

const inactiveCount=lawyers.filter(
l=>(l.status||'Active')==='Inactive'
).length;

return(
<div className="lawyer-management">

<style>{`

*{
box-sizing:border-box;
}

.lawyer-management{
min-height:100vh;
padding:30px;
background:#eef8ff;
font-family:Arial,Helvetica,sans-serif;
color:#111827;
}

.lawyer-container{
max-width:1550px;
margin:auto;
}

.lawyer-header{
display:flex;
align-items:center;
justify-content:space-between;
padding:25px 28px;
margin-bottom:22px;
background:#ffffff;
border:1px solid #d9edf9;
border-radius:16px;
box-shadow:0 5px 20px rgba(0,0,0,.07);
}

.header-left{
display:flex;
align-items:center;
gap:16px;
}

.header-icon{
width:58px;
height:58px;
display:flex;
align-items:center;
justify-content:center;
border-radius:14px;
background:#e0f2fe;
color:#0284c7;
font-size:25px;
}

.header-title{
margin:0;
font-size:28px;
font-weight:800;
color:#111827;
}

.header-subtitle{
margin:6px 0 0;
font-size:14px;
color:#64748b;
}

.add-button{
display:flex;
align-items:center;
gap:9px;
padding:13px 20px;
border:none;
border-radius:9px;
background:#0284c7;
color:#fff;
font-weight:700;
cursor:pointer;
transition:.2s;
}

.add-button:hover{
background:#0369a1;
transform:translateY(-1px);
}

.summary-grid{
display:grid;
grid-template-columns:repeat(3,1fr);
gap:18px;
margin-bottom:22px;
}

.summary-card{
display:flex;
align-items:center;
gap:15px;
padding:20px;
background:#fff;
border:1px solid #d9edf9;
border-radius:14px;
box-shadow:0 5px 18px rgba(0,0,0,.05);
}

.summary-icon{
width:48px;
height:48px;
display:flex;
align-items:center;
justify-content:center;
border-radius:12px;
background:#e0f2fe;
color:#0284c7;
font-size:20px;
}

.summary-label{
display:block;
font-size:13px;
color:#64748b;
margin-bottom:5px;
}

.summary-value{
font-size:25px;
font-weight:800;
color:#111827;
}

.toolbar{
display:flex;
gap:14px;
margin-bottom:20px;
padding:16px;
background:#fff;
border:1px solid #d9edf9;
border-radius:14px;
}

.search-box{
position:relative;
flex:1;
}

.search-box svg{
position:absolute;
left:14px;
top:50%;
transform:translateY(-50%);
color:#94a3b8;
}

.search-input{
width:100%;
height:44px;
padding:0 15px 0 40px;
border:1px solid #d1d5db;
border-radius:8px;
outline:none;
font-size:14px;
}

.search-input:focus{
border-color:#0284c7;
box-shadow:0 0 0 3px rgba(2,132,199,.1);
}

.status-filter{
height:44px;
min-width:160px;
padding:0 14px;
border:1px solid #d1d5db;
border-radius:8px;
background:#fff;
outline:none;
cursor:pointer;
}

.table-card{
background:#fff;
border:1px solid #d9edf9;
border-radius:14px;
overflow:hidden;
box-shadow:0 5px 20px rgba(0,0,0,.06);
}

.table-wrapper{
overflow-x:auto;
}

.lawyer-table{
width:100%;
min-width:1200px;
border-collapse:collapse;
}

.lawyer-table th{
padding:16px;
background:#f0f9ff;
border-bottom:1px solid #dbeafe;
font-size:12px;
font-weight:800;
text-align:left;
color:#334155;
white-space:nowrap;
}

.lawyer-table td{
padding:15px 16px;
border-bottom:1px solid #edf2f7;
font-size:13px;
color:#374151;
}

.lawyer-table tr:hover{
background:#f8fcff;
}

.lawyer-profile{
display:flex;
align-items:center;
gap:10px;
}

.avatar{
width:42px;
height:42px;
display:flex;
align-items:center;
justify-content:center;
border-radius:50%;
background:#e0f2fe;
color:#0284c7;
font-weight:800;
}

.lawyer-name{
font-weight:700;
color:#111827;
}

.lawyer-email{
font-size:11px;
color:#64748b;
margin-top:3px;
}

.status{
display:inline-flex;
padding:5px 10px;
border-radius:20px;
font-size:11px;
font-weight:800;
}

.status.active{
background:#dcfce7;
color:#166534;
}

.status.inactive{
background:#fee2e2;
color:#991b1b;
}

.actions{
display:flex;
gap:6px;
}

.action{
width:34px;
height:34px;
display:flex;
align-items:center;
justify-content:center;
border:none;
border-radius:7px;
cursor:pointer;
transition:.2s;
}

.action:hover{
transform:translateY(-2px);
}

.view{
background:#e0f2fe;
color:#0369a1;
}

.edit{
background:#fef3c7;
color:#92400e;
}

.toggle{
background:#dcfce7;
color:#166534;
}

.delete{
background:#fee2e2;
color:#dc2626;
}

.empty{
padding:60px;
text-align:center;
color:#64748b;
}

.details-overlay{
position:fixed;
inset:0;
z-index:3000;
display:flex;
align-items:center;
justify-content:center;
padding:20px;
background:rgba(0,0,0,.55);
}

.details-modal{
width:100%;
max-width:800px;
max-height:90vh;
overflow-y:auto;
background:#fff;
border-radius:16px;
}

.details-header{
display:flex;
align-items:center;
justify-content:space-between;
padding:20px 24px;
border-bottom:1px solid #e5e7eb;
}

.details-header h2{
margin:0;
font-size:21px;
}

.close{
width:35px;
height:35px;
border:none;
border-radius:8px;
background:#f1f5f9;
cursor:pointer;
}

.details-profile{
display:flex;
align-items:center;
gap:15px;
padding:24px;
}

.details-avatar{
width:60px;
height:60px;
display:flex;
align-items:center;
justify-content:center;
border-radius:50%;
background:#e0f2fe;
color:#0284c7;
font-size:23px;
font-weight:800;
}

.details-name{
margin:0;
font-size:22px;
}

.details-specialization{
margin:5px 0 0;
color:#64748b;
}

.details-grid{
display:grid;
grid-template-columns:repeat(2,1fr);
gap:14px;
padding:0 24px 24px;
}

.detail{
padding:14px;
background:#f8fafc;
border:1px solid #e5e7eb;
border-radius:9px;
}

.detail.full{
grid-column:1/-1;
}

.detail-label{
display:block;
font-size:10px;
font-weight:800;
color:#64748b;
text-transform:uppercase;
margin-bottom:5px;
}

.detail-value{
font-size:14px;
font-weight:600;
color:#111827;
word-break:break-word;
}

@media(max-width:900px){

.summary-grid{
grid-template-columns:1fr;
}

.lawyer-header{
flex-direction:column;
align-items:stretch;
}

.add-button{
justify-content:center;
}

}

@media(max-width:650px){

.lawyer-management{
padding:15px;
}

.toolbar{
flex-direction:column;
}

.status-filter{
width:100%;
}

.details-grid{
grid-template-columns:1fr;
}

.detail.full{
grid-column:auto;
}

.header-title{
font-size:22px;
}

}

`}</style>

<div className="lawyer-container">

<motion.div
className="lawyer-header"
initial={{opacity:0,y:-15}}
animate={{opacity:1,y:0}}
>
<div className="header-left">

<div className="header-icon">
<FaUserTie/>
</div>

<div>
<h1 className="header-title">
Lawyer Management
</h1>

<p className="header-subtitle">
Manage lawyers, legal credentials and professional information
</p>
</div>

</div>

<button
className="add-button"
onClick={()=>navigate('/admin-dashboard/lawyer-registration')}
>
<FaPlus/>
Add New Lawyer
</button>

</motion.div>

<div className="summary-grid">

<div className="summary-card">
<div className="summary-icon">
<FaUserTie/>
</div>
<div>
<span className="summary-label">
Total Lawyers
</span>
<strong className="summary-value">
{lawyers.length}
</strong>
</div>
</div>

<div className="summary-card">
<div className="summary-icon">
<FaToggleOn/>
</div>
<div>
<span className="summary-label">
Active Lawyers
</span>
<strong className="summary-value">
{activeCount}
</strong>
</div>
</div>

<div className="summary-card">
<div className="summary-icon">
<FaToggleOff/>
</div>
<div>
<span className="summary-label">
Inactive Lawyers
</span>
<strong className="summary-value">
{inactiveCount}
</strong>
</div>
</div>

</div>

<div className="toolbar">

<div className="search-box">

<FaSearch/>

<input
className="search-input"
placeholder="Search lawyer by name, CNIC, license, email..."
value={search}
onChange={e=>setSearch(e.target.value)}
/>

</div>

<select
className="status-filter"
value={statusFilter}
onChange={e=>setStatusFilter(e.target.value)}
>
<option value="All">All Status</option>
<option value="Active">Active</option>
<option value="Inactive">Inactive</option>
</select>

</div>

<div className="table-card">

<div className="table-wrapper">

<table className="lawyer-table">

<thead>
<tr>
<th>Lawyer</th>
<th>CNIC</th>
<th>Phone</th>
<th>License</th>
<th>Bar Association</th>
<th>Specialization</th>
<th>Experience</th>
<th>Status</th>
<th>Actions</th>
</tr>
</thead>

<tbody>

{loading?(
<tr>
<td colSpan="9">
<div className="empty">
Loading lawyers...
</div>
</td>
</tr>
):filteredLawyers.length===0?(
<tr>
<td colSpan="9">
<div className="empty">
<FaUserTie size={40}/>
<p>No lawyers found.</p>
</div>
</td>
</tr>
):(
filteredLawyers.map(lawyer=>{

const status=lawyer.status||'Active';

return(
<tr key={lawyer.id}>

<td>

<div className="lawyer-profile">

<div className="avatar">
{(lawyer.fullName||'L').charAt(0).toUpperCase()}
</div>

<div>
<div className="lawyer-name">
{lawyer.fullName}
</div>

<div className="lawyer-email">
{lawyer.email}
</div>
</div>

</div>

</td>

<td>{lawyer.cnic||'-'}</td>

<td>{lawyer.phone||'-'}</td>

<td>{lawyer.licenseNumber||'-'}</td>

<td>{lawyer.barAssociation||'-'}</td>

<td>{lawyer.specialization||'-'}</td>

<td>{lawyer.yearsOfExperience||'0'} years</td>

<td>
<span className={`status ${status==='Active'?'active':'inactive'}`}>
{status}
</span>
</td>

<td>

<div className="actions">

<button
className="action view"
title="View"
onClick={()=>{
setSelected(lawyer);
setShowDetails(true);
}}
>
<FaEye/>
</button>

<button
className="action edit"
title="Edit"
onClick={()=>
navigate(`/admin-dashboard/lawyer-registration/${lawyer.id}`)
}
>
<FaEdit/>
</button>

<button
className="action toggle"
title="Change Status"
onClick={()=>toggleStatus(lawyer)}
>
{status==='Active'?<FaToggleOn/>:<FaToggleOff/>}
</button>

<button
className="action delete"
title="Delete"
onClick={()=>deleteLawyer(lawyer)}
>
<FaTrash/>
</button>

</div>

</td>

</tr>
);

})
)}

</tbody>

</table>

</div>

</div>

</div>

{showDetails&&selected&&(

<div
className="details-overlay"
onClick={()=>setShowDetails(false)}
>

<div
className="details-modal"
onClick={e=>e.stopPropagation()}
>

<div className="details-header">

<h2>Lawyer Details</h2>

<button
className="close"
onClick={()=>setShowDetails(false)}
>
×
</button>

</div>

<div className="details-profile">

<div className="details-avatar">
{(selected.fullName||'L').charAt(0).toUpperCase()}
</div>

<div>
<h2 className="details-name">
{selected.fullName}
</h2>

<p className="details-specialization">
{selected.specialization||'Legal Professional'}
</p>
</div>

</div>

<div className="details-grid">

<div className="detail">
<span className="detail-label">CNIC</span>
<span className="detail-value">{selected.cnic||'-'}</span>
</div>

<div className="detail">
<span className="detail-label">Status</span>
<span className="detail-value">{selected.status||'Active'}</span>
</div>

<div className="detail">
<span className="detail-label">Email</span>
<span className="detail-value">{selected.email||'-'}</span>
</div>

<div className="detail">
<span className="detail-label">Phone</span>
<span className="detail-value">{selected.phone||'-'}</span>
</div>

<div className="detail">
<span className="detail-label">License Number</span>
<span className="detail-value">{selected.licenseNumber||'-'}</span>
</div>

<div className="detail">
<span className="detail-label">Bar Association</span>
<span className="detail-value">{selected.barAssociation||'-'}</span>
</div>

<div className="detail">
<span className="detail-label">Specialization</span>
<span className="detail-value">{selected.specialization||'-'}</span>
</div>

<div className="detail">
<span className="detail-label">Experience</span>
<span className="detail-value">{selected.yearsOfExperience||'0'} years</span>
</div>

<div className="detail">
<span className="detail-label">Court / District</span>
<span className="detail-value">{selected.court||'-'}</span>
</div>

<div className="detail">
<span className="detail-label">Chamber</span>
<span className="detail-value">{selected.chamber||'-'}</span>
</div>

<div className="detail">
<span className="detail-label">Qualification</span>
<span className="detail-value">{selected.qualification||'-'}</span>
</div>

<div className="detail">
<span className="detail-label">Enrollment Date</span>
<span className="detail-value">{selected.barEnrollmentDate||'-'}</span>
</div>

<div className="detail full">
<span className="detail-label">Address</span>
<span className="detail-value">{selected.address||'-'}</span>
</div>

</div>

</div>

</div>

)}

</div>
);
};

export default LawyerManagement;