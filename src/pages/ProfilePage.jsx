import { useState, useEffect, useRef } from 'react';
import useAppStore from '../stores/appStore';
import { supabase } from '../config/supabase';
import QRCode from 'qrcode';
import ReportUpload from '../components/profile/ReportUpload';

export default function ProfilePage() {
    const { profile, user, fetchProfile, setCurrentPage } = useAppStore();
    const [form, setForm] = useState({
        full_name: '',
        age: '',
        gender: '',
        blood_group: '',
        allergies: '',
        chronic_conditions: '',
        emergency_contact: '',
        phone: '',
    });
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [records, setRecords] = useState([]);
    const [qrUrl, setQrUrl] = useState('');
    const qrCanvasRef = useRef(null);

    useEffect(() => {
        if (profile) {
            setForm({
                full_name: profile.full_name || '',
                age: profile.age || '',
                gender: profile.gender || '',
                blood_group: profile.blood_group || '',
                allergies: (profile.allergies || []).join(', '),
                chronic_conditions: (profile.chronic_conditions || []).join(', '),
                emergency_contact: profile.emergency_contact || '',
                phone: profile.phone || '',
            });
        }
    }, [profile]);

    useEffect(() => {
        loadRecords();
    }, []);

    const loadRecords = async () => {
        if (!user) return;
        const { data } = await supabase
            .from('medical_records')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });
        if (data) setRecords(data);
    };

    const handleSave = async () => {
        if (!user) return;
        setSaving(true);
        setSaved(false);

        const updateData = {
            full_name: form.full_name,
            age: form.age ? parseInt(form.age) : null,
            gender: form.gender || null,
            blood_group: form.blood_group || null,
            allergies: form.allergies ? form.allergies.split(',').map((s) => s.trim()).filter(Boolean) : [],
            chronic_conditions: form.chronic_conditions ? form.chronic_conditions.split(',').map((s) => s.trim()).filter(Boolean) : [],
            emergency_contact: form.emergency_contact || null,
            phone: form.phone || null,
            updated_at: new Date().toISOString(),
        };

        await supabase.from('profiles').update(updateData).eq('id', user.id);
        await fetchProfile(user.id);
        setSaving(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const generateQR = async () => {
        try {
            const profileData = {
                name: form.full_name,
                age: form.age,
                blood_group: form.blood_group,
                allergies: form.allergies,
                emergency_contact: form.emergency_contact,
            };
            const qrData = JSON.stringify(profileData);
            const url = await QRCode.toDataURL(qrData, {
                width: 256,
                margin: 2,
                color: { dark: '#14b8a6', light: '#09090b' },
            });
            setQrUrl(url);
        } catch (err) {
            console.error('QR generation error:', err);
        }
    };

    const recordTypeIcons = {
        summary: '📋',
        report: '📄',
        prescription: '💊',
        image: '🖼️',
        other: '📎',
    };

    return (
        <div className="h-full w-full flex overflow-hidden bg-background">
            {/* Back button sidebar */}
            <div className="w-16 border-r border-border flex flex-col items-center py-4">
                <button
                    onClick={() => setCurrentPage('dashboard')}
                    className="p-3 hover:bg-muted rounded-xl transition-colors"
                    title="Back to Dashboard"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
                </button>
            </div>

            {/* Main content */}
            <div className="flex-1 overflow-y-auto">
                <div className="max-w-4xl mx-auto px-6 py-8">
                    {/* Page header */}
                    <div className="mb-8">
                        <h1 className="text-2xl font-bold gradient-text">Health Profile</h1>
                        <p className="text-sm text-muted-foreground mt-1">Manage your personal health information</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Profile form */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="glass-card p-6">
                                <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                                    Personal Information
                                </h2>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-muted-foreground mb-1">Full Name</label>
                                        <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-muted-foreground mb-1">Age</label>
                                        <input type="number" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-muted-foreground mb-1">Gender</label>
                                        <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all">
                                            <option value="">Select</option>
                                            <option value="male">Male</option>
                                            <option value="female">Female</option>
                                            <option value="other">Other</option>
                                            <option value="prefer_not_to_say">Prefer not to say</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-muted-foreground mb-1">Blood Group</label>
                                        <select value={form.blood_group} onChange={(e) => setForm({ ...form, blood_group: e.target.value })} className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all">
                                            <option value="">Select</option>
                                            {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                                                <option key={bg} value={bg}>{bg}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label className="block text-xs font-medium text-muted-foreground mb-1">Allergies (comma-separated)</label>
                                        <input value={form.allergies} onChange={(e) => setForm({ ...form, allergies: e.target.value })} placeholder="e.g. Penicillin, Peanuts" className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all" />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label className="block text-xs font-medium text-muted-foreground mb-1">Chronic Conditions (comma-separated)</label>
                                        <input value={form.chronic_conditions} onChange={(e) => setForm({ ...form, chronic_conditions: e.target.value })} placeholder="e.g. Diabetes, Hypertension" className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-muted-foreground mb-1">Emergency Contact</label>
                                        <input value={form.emergency_contact} onChange={(e) => setForm({ ...form, emergency_contact: e.target.value })} className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-muted-foreground mb-1">Phone</label>
                                        <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all" />
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 mt-6">
                                    <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
                                        {saving ? 'Saving...' : 'Save Profile'}
                                    </button>
                                    {saved && <span className="text-sm text-success animate-fade-in">✓ Saved</span>}
                                </div>
                            </div>

                            {/* Medical Records */}
                            <div className="glass-card p-6 mt-6">
                                <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                                    Medical Records
                                </h2>

                                {records.length === 0 ? (
                                    <p className="text-sm text-muted-foreground py-4 text-center">No records yet. Complete a consultation or upload files to generate records.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {records.map((record) => (
                                            <div key={record.id} className="flex items-center gap-3 px-4 py-3 bg-muted/50 rounded-xl border border-border hover:bg-muted transition-colors">
                                                <span className="text-lg">{recordTypeIcons[record.record_type] || '📎'}</span>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-foreground truncate">{record.title}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {new Date(record.created_at).toLocaleDateString('en-US', {
                                                            year: 'numeric', month: 'short', day: 'numeric',
                                                        })}
                                                        {' · '}
                                                        <span className="capitalize">{record.record_type}</span>
                                                    </p>
                                                </div>
                                                {record.file_url && (
                                                    <a href={record.file_url} target="_blank" rel="noopener noreferrer" className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors" title="View Document">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                                                    </a>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Upload Component */}
                            <ReportUpload onUploadComplete={loadRecords} />
                        </div>

                        {/* QR Code */}
                        <div className="space-y-6">
                            <div className="glass-card p-6 text-center">
                                <h2 className="text-sm font-semibold text-foreground mb-2 flex items-center justify-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>
                                    QR Medical Card
                                </h2>
                                <p className="text-xs text-muted-foreground mb-4">Share your essential health info with healthcare providers</p>

                                {qrUrl ? (
                                    <div className="animate-fade-in">
                                        <img src={qrUrl} alt="Medical QR Code" className="w-48 h-48 mx-auto rounded-xl border border-border" />
                                        <p className="text-xs text-muted-foreground mt-3">Scan to view medical data</p>
                                    </div>
                                ) : (
                                    <div className="w-48 h-48 mx-auto bg-muted/50 rounded-xl border border-border flex items-center justify-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground/30"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>
                                    </div>
                                )}

                                <button onClick={generateQR} className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors w-full">
                                    {qrUrl ? 'Regenerate QR' : 'Generate QR Code'}
                                </button>
                            </div>

                            {/* Quick stats */}
                            <div className="glass-card p-6">
                                <h2 className="text-sm font-semibold text-foreground mb-3">Quick Stats</h2>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-muted-foreground">Consultations</span>
                                        <span className="text-sm font-medium text-foreground">{records.filter((r) => r.record_type === 'summary').length}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-muted-foreground">Reports</span>
                                        <span className="text-sm font-medium text-foreground">{records.filter((r) => r.record_type === 'report').length}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-muted-foreground">Total Records</span>
                                        <span className="text-sm font-medium text-foreground">{records.length}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
