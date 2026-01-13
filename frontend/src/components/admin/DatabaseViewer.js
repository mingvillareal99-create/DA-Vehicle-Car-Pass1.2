/**
 * Database Viewer Component
 * Admin tool for viewing, editing, and managing database collections
 * Provides full CRUD functionality for all database tables
 */
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../../services/constants';
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Badge } from "../ui/badge";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Database, Edit, Trash2, Search, RefreshCw } from "lucide-react";

const DatabaseViewer = () => {
  // State management
  const [collections, setCollections] = useState({});
  const [selectedCollection, setSelectedCollection] = useState('users');
  const [documents, setDocuments] = useState([]);
  const [totalDocs, setTotalDocs] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [editingDoc, setEditingDoc] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  
  const PAGE_SIZE = 20;

  // Fetch collections on mount
  useEffect(() => {
    fetchCollections();
  }, []);

  // Fetch documents when collection or page changes
  useEffect(() => {
    if (selectedCollection) {
      fetchDocuments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCollection, page]);

  /**
   * Fetch list of all collections and their counts
   */
  const fetchCollections = async () => {
    try {
      const response = await axios.get(`${API}/database/collections`);
      setCollections(response.data);
    } catch (error) {
      console.error('Error fetching collections:', error);
    }
  };

  /**
   * Fetch documents from selected collection with pagination
   */
  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${API}/database/${selectedCollection}?skip=${page * PAGE_SIZE}&limit=${PAGE_SIZE}`
      );
      setDocuments(response.data.documents);
      setTotalDocs(response.data.total);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Open edit modal for a document
   */
  const handleEdit = (doc) => {
    setEditingDoc({ ...doc });
    setIsEditModalOpen(true);
  };

  /**
   * Save edited document to database
   */
  const handleSave = async () => {
    try {
      await axios.put(`${API}/database/${selectedCollection}/${editingDoc.id}`, editingDoc);
      setIsEditModalOpen(false);
      setEditingDoc(null);
      fetchDocuments();
      alert('Document updated successfully!');
    } catch (error) {
      console.error('Error updating document:', error);
      alert('Error updating document: ' + (error.response?.data?.detail || 'Unknown error'));
    }
  };

  /**
   * Delete document with confirmation
   * First click sets deleteConfirm, second click actually deletes
   */
  const handleDelete = async (docId) => {
    if (deleteConfirm === docId) {
      try {
        await axios.delete(`${API}/database/${selectedCollection}/${docId}`);
        fetchDocuments();
        setDeleteConfirm(null);
        alert('Document deleted successfully!');
      } catch (error) {
        console.error('Error deleting document:', error);
        alert('Error deleting document: ' + (error.response?.data?.detail || 'Unknown error'));
      }
    } else {
      setDeleteConfirm(docId);
      // Auto-reset confirmation after 3 seconds
      setTimeout(() => setDeleteConfirm(null), 3000);
    }
  };

  /**
   * Render a value for display in the table
   */
  const renderValue = (value, key) => {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'boolean') return value.toString();
    if (typeof value === 'object') {
      if (value instanceof Date || (typeof value === 'string' && value.includes('ISODate'))) {
        return new Date(value).toLocaleString();
      }
      return JSON.stringify(value, null, 2);
    }
    // Mask password field
    if (key === 'password') return '••••••••';
    return value.toString();
  };

  /**
   * Render appropriate edit field based on value type
   */
  const renderEditField = (key, value) => {
    // ID fields are read-only
    if (key === '_id' || key === 'id') {
      return (
        <Input value={value || ''} disabled className="bg-gray-100" />
      );
    }

    // Password field - special handling
    if (key === 'password') {
      return (
        <Input
          type="password"
          placeholder="Enter new password (leave blank to keep current)"
          onChange={(e) => {
            if (e.target.value) {
              setEditingDoc(prev => ({ ...prev, [key]: e.target.value }));
            }
          }}
        />
      );
    }

    // Boolean field - dropdown
    if (typeof value === 'boolean') {
      return (
        <Select 
          value={value.toString()} 
          onValueChange={(val) => setEditingDoc(prev => ({ ...prev, [key]: val === 'true' }))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">true</SelectItem>
            <SelectItem value="false">false</SelectItem>
          </SelectContent>
        </Select>
      );
    }

    // Object field - JSON textarea
    if (typeof value === 'object') {
      return (
        <Textarea
          value={JSON.stringify(value, null, 2)}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value);
              setEditingDoc(prev => ({ ...prev, [key]: parsed }));
            } catch (err) {
              // Invalid JSON - don't update
            }
          }}
          rows={5}
          className="font-mono text-xs"
        />
      );
    }

    // Default - text input
    return (
      <Input
        value={value || ''}
        onChange={(e) => setEditingDoc(prev => ({ ...prev, [key]: e.target.value }))}
      />
    );
  };

  // Filter documents based on search term
  const filteredDocuments = documents.filter(doc => {
    if (!searchTerm) return true;
    return JSON.stringify(doc).toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="space-y-6" data-testid="database-viewer">
      {/* Header with search */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Database className="w-6 h-6 text-green-600" />
          <div>
            <h2 className="text-2xl font-bold text-green-700">Database Viewer</h2>
            <p className="text-gray-600">View, edit, and manage database collections</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Search className="w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64"
            data-testid="database-search-input"
          />
        </div>
      </div>

      {/* Collection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Object.values(collections).map(collection => (
          <Card 
            key={collection.name}
            className={`cursor-pointer transition-colors ${
              selectedCollection === collection.name 
                ? 'bg-green-50 border-green-300' 
                : 'hover:bg-gray-50'
            }`}
            onClick={() => {
              setSelectedCollection(collection.name);
              setPage(0);
            }}
            data-testid={`collection-card-${collection.name}`}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold capitalize">
                    {collection.name.replace('_', ' ')}
                  </h3>
                  <p className="text-sm text-gray-600">{collection.count} documents</p>
                </div>
                <Database className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Document Table */}
      {selectedCollection && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="capitalize text-green-700">
                {selectedCollection.replace('_', ' ')} Collection
              </CardTitle>
              <div className="flex items-center space-x-2">
                <Badge variant="outline">{totalDocs} total documents</Badge>
                <Button size="sm" onClick={fetchDocuments} data-testid="refresh-btn">
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Refresh
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-green-600" />
                <p>Loading documents...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-200">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-200 px-4 py-2 text-left">ID</th>
                        {filteredDocuments[0] && Object.keys(filteredDocuments[0])
                          .filter(key => key !== '_id' && key !== 'id')
                          .slice(0, 5)
                          .map(key => (
                            <th key={key} className="border border-gray-200 px-4 py-2 text-left capitalize">
                              {key.replace('_', ' ')}
                            </th>
                          ))}
                        <th className="border border-gray-200 px-4 py-2 text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDocuments.map(doc => (
                        <tr key={doc._id || doc.id} className="hover:bg-gray-50">
                          <td className="border border-gray-200 px-4 py-2 font-mono text-xs">
                            {doc.id?.substring(0, 8) || doc._id?.substring(0, 8)}...
                          </td>
                          {Object.keys(doc)
                            .filter(key => key !== '_id' && key !== 'id')
                            .slice(0, 5)
                            .map(key => (
                              <td key={key} className="border border-gray-200 px-4 py-2 max-w-xs">
                                <div className="truncate" title={renderValue(doc[key], key)}>
                                  {renderValue(doc[key], key)}
                                </div>
                              </td>
                            ))}
                          <td className="border border-gray-200 px-4 py-2">
                            <div className="flex items-center space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEdit(doc)}
                                data-testid={`edit-btn-${doc.id}`}
                              >
                                <Edit className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant={deleteConfirm === doc.id ? "destructive" : "outline"}
                                onClick={() => handleDelete(doc.id)}
                                data-testid={`delete-btn-${doc.id}`}
                              >
                                <Trash2 className="w-3 h-3" />
                                {deleteConfirm === doc.id && <span className="ml-1">Confirm?</span>}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Showing {page * PAGE_SIZE + 1} to {Math.min((page + 1) * PAGE_SIZE, totalDocs)} of {totalDocs} documents
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={page === 0}
                      onClick={() => setPage(page - 1)}
                      data-testid="prev-page-btn"
                    >
                      Previous
                    </Button>
                    <span className="px-3 py-1 bg-gray-100 rounded">
                      Page {page + 1} of {Math.ceil(totalDocs / PAGE_SIZE) || 1}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={(page + 1) * PAGE_SIZE >= totalDocs}
                      onClick={() => setPage(page + 1)}
                      data-testid="next-page-btn"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-green-700 flex items-center">
              <Edit className="w-5 h-5 mr-2" />
              Edit {selectedCollection} Document
            </DialogTitle>
          </DialogHeader>
          
          {editingDoc && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                {Object.entries(editingDoc).map(([key, value]) => (
                  <div key={key}>
                    <Label className="text-sm font-medium text-gray-600 capitalize">
                      {key.replace('_', ' ')}
                    </Label>
                    <div className="mt-1">
                      {renderEditField(key, value)}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingDoc(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  className="bg-green-600 hover:bg-green-700"
                  data-testid="save-doc-btn"
                >
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DatabaseViewer;
