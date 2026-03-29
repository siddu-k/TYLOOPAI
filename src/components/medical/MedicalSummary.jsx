import { useState, useEffect } from 'react';
import useAppStore from '../../stores/appStore';
import { generateSummary } from '../../services/ollamaService';
import { supabase } from '../../config/supabase';

export default function MedicalSummary({ onClose }) {
    const { messages, currentSession, user, profile } = useAppStore();
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Doctor Booking States
    const [doctors, setDoctors] = useState([]);
    const [showNearMe, setShowNearMe] = useState(false);
    const [bookingId, setBookingId] = useState(null);
    const [bookingSuccess, setBookingSuccess] = useState(false);
    const [hasStarted, setHasStarted] = useState(false);

    // Haversine distance calc
    const getDistance = (lat1, lon1, lat2, lon2) => {
        if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
        const R = 6371; // km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    useEffect(() => {
        if (!hasStarted) {
            setHasStarted(true);
            handleGenerate();
        }
    }, [hasStarted]);

    const handleGenerate = async () => {
        if (messages.length < 2) {
            setError('Need at least one exchange to generate a summary.');
            return;
        }
        setLoading(true);
        setError('');

        try {
            const result = await generateSummary(messages);
            if (result) {
                setSummary(result);

                // Save to session
                if (currentSession) {
                    await supabase
                        .from('chat_sessions')
                        .update({
                            summary: result,
                            severity: result.severity,
                            status: 'ended',
                            ended_at: new Date().toISOString(),
                        })
                        .eq('id', currentSession.id);

                    // Save as medical record
                    if (user) {
                        await supabase.from('medical_records').insert({
                            user_id: user.id,
                            title: currentSession.title || 'Consultation Summary',
                            record_type: 'summary',
                            notes: JSON.stringify(result),
                            session_id: currentSession.id,
                        });
                    }
                }

                // Fetch Doctors for matching
                const { data: docs } = await supabase.from('doctors').select('*').eq('available_status', true);
                if (docs && docs.length > 0) {
                    const aiSpec = (result.specialist_type || '').toLowerCase();
                    const processed = docs.map(d => {
                        const dist = getDistance(profile?.latitude, profile?.longitude, d.latitude, d.longitude);
                        const docSpec = (d.specialty || '').toLowerCase();
                        // Loose match on first 5 chars e.g. "Cardio" matches "Cardiologist" and "Cardiology"
                        const isMatch = aiSpec.length > 4 && (docSpec.includes(aiSpec.substring(0, 5)) || aiSpec.includes(docSpec.substring(0, 5)));
                        return { ...d, distance: dist, isMatch };
                    });

                    // Sort so matches are at top, then closer distance
                    processed.sort((a, b) => {
                        if (a.isMatch && !b.isMatch) return -1;
                        if (!a.isMatch && b.isMatch) return 1;
                        return a.distance - b.distance;
                    });
                    setDoctors(processed);
                }
            } else {
                setError('Could not generate summary. Please try again.');
            }
        } catch (err) {
            setError('Failed to generate summary: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const severityColors = {
        low: 'bg-success/10 text-success border-success/20',
        moderate: 'bg-warning/10 text-warning border-warning/20',
        high: 'bg-destructive/10 text-destructive border-destructive/20',
        critical: 'bg-destructive/20 text-destructive border-destructive/30',
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="glass-card w-full max-w-2xl max-h-[80vh] overflow-y-auto p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-lg font-semibold gradient-text">Medical Summary</h2>
                        <p className="text-sm text-muted-foreground">AI-generated consultation summary</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    </button>
                </div>

                {error && !loading && !summary && (
                    <div className="text-center py-8">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-destructive/10 flex items-center justify-center border border-destructive/20">
                            <span className="text-2xl">⚠️</span>
                        </div>
                        <p className="text-sm text-destructive mb-4">{error}</p>
                        <button onClick={handleGenerate} className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium">Try Again</button>
                    </div>
                )}

                {loading && (
                    <div className="flex flex-col items-center py-8">
                        <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4" />
                        <p className="text-sm text-muted-foreground">Analyzing consultation...</p>
                    </div>
                )}

                {error && (
                    <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3 mb-4">
                        {error}
                    </div>
                )}

                {summary && (
                    <div className="space-y-4 animate-fade-in-up">
                        {/* Severity badge */}
                        {summary.severity && (
                            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border ${severityColors[summary.severity] || ''}`}>
                                <span className="w-2 h-2 rounded-full bg-current" />
                                Severity: {summary.severity.charAt(0).toUpperCase() + summary.severity.slice(1)}
                            </div>
                        )}

                        {/* Chief complaint */}
                        {summary.chief_complaint && (
                            <div className="bg-muted/50 rounded-xl p-4 border border-border">
                                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Chief Complaint</h3>
                                <p className="text-sm text-foreground">{summary.chief_complaint}</p>
                            </div>
                        )}

                        {/* Symptoms */}
                        {summary.symptoms?.length > 0 && (
                            <div className="bg-muted/50 rounded-xl p-4 border border-border">
                                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Reported Symptoms</h3>
                                <div className="flex flex-wrap gap-2">
                                    {summary.symptoms.map((s, i) => (
                                        <span key={i} className="px-2.5 py-1 bg-background rounded-lg text-xs text-foreground border border-border">{s}</span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Possible conditions */}
                        {summary.possible_conditions?.length > 0 && (
                            <div className="bg-muted/50 rounded-xl p-4 border border-border">
                                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Possible Conditions (Educational)</h3>
                                <ul className="space-y-1">
                                    {summary.possible_conditions.map((c, i) => (
                                        <li key={i} className="text-sm text-foreground flex items-start gap-2">
                                            <span className="text-primary mt-1">•</span>{c}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Recommendations */}
                        {summary.recommendations?.length > 0 && (
                            <div className="bg-primary/5 rounded-xl p-4 border border-primary/10">
                                <h3 className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Recommendations</h3>
                                <ul className="space-y-1">
                                    {summary.recommendations.map((r, i) => (
                                        <li key={i} className="text-sm text-foreground flex items-start gap-2">
                                            <span className="text-primary mt-1">→</span>{r}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Escalation */}
                        {summary.should_escalate && (
                            <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-destructive"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                                    <h3 className="text-sm font-semibold text-destructive">Professional Consultation Recommended</h3>
                                </div>
                                <p className="text-sm text-foreground mb-4">
                                    Based on this consultation, we recommend seeing a <span className="font-semibold">{summary.specialist_type || 'healthcare professional'}</span>.
                                    {profile?.latitude ? " Here are available specialists nearby." : " Please enable location services to see nearby clinics."}
                                </p>

                                {/* Doctor Booking UI */}
                                {doctors.length > 0 && (
                                    <div className="bg-background rounded-lg border border-border p-3">
                                        <div className="flex items-center justify-between mb-3 border-b border-border pb-2">
                                            <h4 className="text-xs font-semibold text-muted-foreground uppercase">Available Doctors</h4>

                                            <div className="flex bg-muted p-1 rounded-lg">
                                                <button
                                                    onClick={() => setShowNearMe(true)}
                                                    className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${showNearMe ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}
                                                >
                                                    Near Me (&lt;50km)
                                                </button>
                                                <button
                                                    onClick={() => setShowNearMe(false)}
                                                    className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${!showNearMe ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}
                                                >
                                                    All Doctors
                                                </button>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            {doctors.filter(d => !showNearMe || d.distance < 50).slice(0, 3).map(doc => (
                                                <div key={doc.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors border border-transparent hover:border-border">
                                                    <div>
                                                        <p className="text-sm font-medium text-foreground flex items-center gap-2">
                                                            {doc.full_name}
                                                            {doc.isMatch && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-primary/20 text-primary">BEST MATCH</span>}
                                                        </p>
                                                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                                                            <span>{doc.specialty}</span>
                                                            {doc.distance !== Infinity && (
                                                                <span className="flex items-center gap-1">
                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                                                                    {doc.distance.toFixed(1)} km away
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {bookingSuccess && bookingId === doc.id ? (
                                                        <span className="text-xs font-medium text-green-500 bg-green-500/10 px-3 py-1.5 rounded-md">Requested</span>
                                                    ) : (
                                                        <button
                                                            disabled={bookingId !== null}
                                                            onClick={async () => {
                                                                setBookingId(doc.id);
                                                                await supabase.from('appointments').insert({
                                                                    patient_id: user.id,
                                                                    doctor_id: doc.id,
                                                                    session_id: currentSession?.id,
                                                                    status: 'pending'
                                                                });
                                                                setBookingSuccess(true);
                                                            }}
                                                            className="text-xs font-medium px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-md transition-colors whitespace-nowrap"
                                                        >
                                                            {bookingId === doc.id ? 'Booking...' : 'Book'}
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                            {doctors.filter(d => !showNearMe || d.distance < 50).length === 0 && (
                                                <p className="text-xs text-muted-foreground text-center py-2">No nearby doctors found in this category.</p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Disclaimer */}
                        <p className="text-xs text-muted-foreground/60 text-center pt-2">
                            ⚠️ This is an AI-generated summary for informational purposes only. Not a medical diagnosis.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
