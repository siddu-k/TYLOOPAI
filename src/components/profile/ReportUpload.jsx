import { useState, useRef } from 'react';
import { supabase } from '../../config/supabase';
import useAppStore from '../../stores/appStore';

export default function ReportUpload({ onUploadComplete }) {
    const { user } = useAppStore();
    const fileInputRef = useRef(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const [title, setTitle] = useState('');
    const [recordType, setRecordType] = useState('report');
    const [selectedFile, setSelectedFile] = useState(null);

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                setError('File size must be less than 5MB');
                return;
            }
            setSelectedFile(file);
            if (!title) setTitle(file.name.split('.')[0]);
            setError('');
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!user || !selectedFile || !title) return;

        setUploading(true);
        setError('');

        try {
            // 1. Upload file to Supabase Storage
            const fileExt = selectedFile.name.split('.').pop();
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `${user.id}/${fileName}`;

            const { error: uploadError, data: uploadData } = await supabase.storage
                .from('medical-files')
                .upload(filePath, selectedFile);

            if (uploadError) throw uploadError;

            // 2. Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('medical-files')
                .getPublicUrl(filePath);

            // 3. Insert record in medical_records table
            const { error: dbError } = await supabase.from('medical_records').insert({
                user_id: user.id,
                title,
                record_type: recordType,
                file_url: publicUrl,
            });

            if (dbError) throw dbError;

            // Reset form
            setSelectedFile(null);
            setTitle('');
            setRecordType('report');
            if (fileInputRef.current) fileInputRef.current.value = '';

            if (onUploadComplete) onUploadComplete();
        } catch (err) {
            console.error('Upload Error:', err);
            setError('Failed to upload file: ' + err.message);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="glass-card p-6 mt-6">
            <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                Upload Medical Document
            </h2>

            <form onSubmit={handleUpload} className="space-y-4">
                {error && (
                    <div className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-2">
                        {error}
                    </div>
                )}

                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Document Title</label>
                        <input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g. Blood Test Results"
                            className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                            required
                        />
                    </div>
                    <div className="w-full sm:w-48">
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Type</label>
                        <select
                            value={recordType}
                            onChange={(e) => setRecordType(e.target.value)}
                            className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                            <option value="report">Lab Report</option>
                            <option value="prescription">Prescription</option>
                            <option value="image">Medical Image</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">File (Max 5MB)</label>
                    <div className="flex items-center gap-3">
                        <input
                            ref={fileInputRef}
                            type="file"
                            onChange={handleFileChange}
                            accept=".pdf,.jpg,.jpeg,.png"
                            className="hidden"
                            required
                        />
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="px-4 py-2 bg-muted border border-border rounded-lg text-sm font-medium hover:bg-muted/80 transition-colors"
                        >
                            Choose File
                        </button>
                        <span className="text-xs text-muted-foreground truncate flex-1">
                            {selectedFile ? selectedFile.name : 'No file chosen'}
                        </span>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={!selectedFile || !title || uploading}
                    className="w-full py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {uploading ? (
                        <>
                            <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                            Uploading...
                        </>
                    ) : (
                        'Upload Document'
                    )}
                </button>
            </form>
        </div>
    );
}
