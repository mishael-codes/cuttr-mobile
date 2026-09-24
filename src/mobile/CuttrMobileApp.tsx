import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Share,
  Modal,
  ActivityIndicator,
} from 'react-native';
import auth from '../firebase/auth';
import db from '../firebase/firestore';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
} from 'firebase/auth';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  updateDoc,
} from 'firebase/firestore';
import { nanoid } from 'nanoid';
import * as Feather from 'react-feather';

export type TabType = 'home' | 'shorten' | 'dashboard' | 'settings';

interface LinkItem {
  id: string;
  url: string;
  shortLink: string;
  slug?: string;
  qrCodeData?: string;
  timesClicked: number;
  linkName?: string;
}

export const CuttrMobileApp: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<TabType>('home');
  const [user, setUser] = useState(auth.currentUser);

  // Shortener form state
  const [destinationUrl, setDestinationUrl] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  const [customAlias, setCustomAlias] = useState('');
  const [isShortening, setIsShortening] = useState(false);
  const [shortenError, setShortenError] = useState('');
  const [createdLink, setCreatedLink] = useState<LinkItem | null>(null);

  // Dashboard & Links state
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [isLoadingLinks, setIsLoadingLinks] = useState(false);
  const [activeQRModal, setActiveQRModal] = useState<LinkItem | null>(null);
  const [editingLink, setEditingLink] = useState<LinkItem | null>(null);
  const [editUrlInput, setEditUrlInput] = useState('');
  const [copiedToast, setCopiedToast] = useState(false);

  // Auth modal / state
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authError, setAuthError] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  // Settings state
  const [settingsName, setSettingsName] = useState('');
  const [settingsSaved, setSettingsSaved] = useState(false);

  // Listen to auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser?.displayName) {
        setSettingsName(currentUser.displayName);
      }
    });
    return () => unsubscribe();
  }, []);

  // Fetch links when user or tab changes
  useEffect(() => {
    if (!user) {
      setLinks([]);
      return;
    }

    const fetchLinks = async () => {
      setIsLoadingLinks(true);
      try {
        const userSlugCollection = collection(db, 'user-collection', user.uid, 'slug');
        const querySnapshot = await getDocs(userSlugCollection);
        const fetchedLinks: LinkItem[] = [];

        for (const docSnap of querySnapshot.docs) {
          const data = docSnap.data();
          const globalRef = doc(db, 'urls', docSnap.id);
          let timesClicked = data.timesClicked || 0;

          try {
            const globalDoc = await getDoc(globalRef);
            if (globalDoc.exists()) {
              timesClicked = globalDoc.data().timesClicked ?? timesClicked;
            }
          } catch {
            // fallback to user record
          }

          fetchedLinks.push({
            id: docSnap.id,
            url: data.url || '',
            shortLink: data.shortLink || `${window.location.origin}/${data.slug || docSnap.id}`,
            slug: data.slug || docSnap.id,
            qrCodeData: data.qrCodeData,
            timesClicked,
            linkName: data.linkName || 'Untitled Link',
          });
        }

        setLinks(fetchedLinks);
        try {
          localStorage.setItem('cuttr_mobile_cached_links', JSON.stringify(fetchedLinks));
        } catch (e) {
          console.log(e);
        }
      } catch (err) {
        console.log('Error fetching links:', err);
        try {
          const cached = localStorage.getItem('cuttr_mobile_cached_links');
          if (cached) setLinks(JSON.parse(cached));
        } catch (e) {
          console.log(e);
        }
      } finally {
        setIsLoadingLinks(false);
      }
    };

    if (currentTab === 'dashboard') {
      fetchLinks();
    }
  }, [user, currentTab]);

  // Generate QR code URL
  const generateQrUrl = (url: string) => {
    return `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(
      url
    )}&color=000000&bgcolor=ffffff&margin=8`;
  };

  // Handle Shortening
  const handleShorten = async () => {
    setShortenError('');
    if (!destinationUrl.trim()) {
      setShortenError('Please enter a destination URL.');
      return;
    }

    let urlToSave = destinationUrl.trim();
    if (!/^https?:\/\//i.test(urlToSave)) {
      urlToSave = `https://${urlToSave}`;
    }

    setIsShortening(true);
    try {
      const slug = customAlias.trim() ? customAlias.trim().toLowerCase() : nanoid(6);
      const origin = typeof window !== 'undefined' ? window.location.origin : 'https://cuttr.app';
      const shortUrl = `${origin}/${slug}`;
      const qrData = generateQrUrl(shortUrl);

      // Save to global urls collection
      const urlDocRef = doc(db, 'urls', slug);
      await setDoc(urlDocRef, {
        url: urlToSave,
        slug,
        timesClicked: 0,
        createdAt: new Date().toISOString(),
      });

      const newLinkObj: LinkItem = {
        id: slug,
        url: urlToSave,
        shortLink: shortUrl,
        slug,
        qrCodeData: qrData,
        timesClicked: 0,
        linkName: linkTitle.trim() || 'My Link',
      };

      // If user is authenticated, also save to user collection
      if (user) {
        const userSlugDoc = doc(db, 'user-collection', user.uid, 'slug', slug);
        await setDoc(userSlugDoc, newLinkObj);
        setLinks((prev) => [newLinkObj, ...prev]);
      }

      setCreatedLink(newLinkObj);
      setDestinationUrl('');
      setLinkTitle('');
      setCustomAlias('');
    } catch (err) {
      console.error(err);
      setShortenError('Failed to shorten link. Please try again.');
    } finally {
      setIsShortening(false);
    }
  };

  // Native mobile Share
  const handleShare = async (link: LinkItem) => {
    try {
      await Share.share({
        title: link.linkName || 'Cuttr Short Link',
        message: `${link.linkName ? link.linkName + ': ' : ''}${link.shortLink}`,
        url: link.shortLink,
      });
    } catch {
      // User cancelled
    }
  };

  // Copy to clipboard with toast
  const handleCopy = (text: string) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(text);
      }
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 2000);
    } catch {
      // Fallback
    }
  };

  // Delete a link
  const handleDeleteLink = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'urls', id));
      if (user) {
        await deleteDoc(doc(db, 'user-collection', user.uid, 'slug', id));
      }
      setLinks((prev) => prev.filter((l) => l.id !== id));
    } catch (err) {
      console.error('Delete failed', err);
    }
  };

  // Save edited destination URL
  const handleSaveEdit = async () => {
    if (!editingLink || !editUrlInput.trim()) return;
    const newUrl = editUrlInput.trim();
    try {
      await updateDoc(doc(db, 'urls', editingLink.id), { url: newUrl });
      if (user) {
        await updateDoc(doc(db, 'user-collection', user.uid, 'slug', editingLink.id), {
          url: newUrl,
        });
      }
      setLinks((prev) =>
        prev.map((l) => (l.id === editingLink.id ? { ...l, url: newUrl } : l))
      );
      setEditingLink(null);
    } catch (err) {
      console.error('Save failed', err);
    }
  };

  // Auth form submit
  const handleAuthSubmit = async () => {
    setAuthError('');
    if (!authEmail || !authPassword) {
      setAuthError('Please fill in all fields.');
      return;
    }

    setIsAuthLoading(true);
    try {
      if (authMode === 'signup') {
        const userCred = await createUserWithEmailAndPassword(auth, authEmail, authPassword);
        if (authName.trim()) {
          await updateProfile(userCred.user, { displayName: authName.trim() });
        }
      } else {
        await signInWithEmailAndPassword(auth, authEmail, authPassword);
      }
      setShowAuthModal(false);
      setAuthEmail('');
      setAuthPassword('');
      setAuthName('');
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      if (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
        setAuthError('Incorrect email or password.');
      } else if (e.code === 'auth/email-already-in-use') {
        setAuthError('An account with this email already exists.');
      } else if (e.code === 'auth/weak-password') {
        setAuthError('Password must be at least 6 characters.');
      } else {
        setAuthError(e.message || 'Authentication failed.');
      }
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Profile update in Settings
  const handleUpdateSettingsProfile = async () => {
    if (!user || !settingsName.trim()) return;
    try {
      await updateProfile(user, { displayName: settingsName.trim() });
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 2500);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#050505" />

      {/* Mobile Top Header */}
      <View style={styles.topHeader}>
        <View style={styles.brandRow}>
          <Text style={styles.logoText}>Cuttr</Text>
          <View style={styles.logoDot} />
          <Text style={styles.mobileBadge}>MOBILE</Text>
        </View>

        {user ? (
          <TouchableOpacity
            style={styles.userBadge}
            onPress={() => setCurrentTab('settings')}
          >
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitial}>
                {user.displayName ? user.displayName[0].toUpperCase() : 'U'}
              </Text>
            </View>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.headerAuthButton}
            onPress={() => {
              setAuthMode('signin');
              setShowAuthModal(true);
            }}
          >
            <Text style={styles.headerAuthButtonText}>Sign In</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Main Content Area based on active tab */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ==================== HOME TAB ==================== */}
        {currentTab === 'home' && (
          <View style={styles.tabContent}>
            {/* Hero Card */}
            <View style={styles.heroCard}>
              <Text style={styles.heroTitle}>
                Shorten Links.{'\n'}
                <Text style={styles.heroTitleGold}>Track Everywhere.</Text>
              </Text>
              <Text style={styles.heroSubtitle}>
                The mobile URL shortener with instant QR codes and real-time click tracking.
              </Text>
            </View>

            {/* Link Shortener Card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Shorten URL</Text>

              <Text style={styles.inputLabel}>DESTINATION URL</Text>
              <TextInput
                style={styles.input}
                placeholder="https://your-long-link.com/article"
                placeholderTextColor="#666"
                value={destinationUrl}
                onChangeText={setDestinationUrl}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />

              {user && (
                <>
                  <Text style={styles.inputLabel}>LINK TITLE (OPTIONAL)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Portfolio Website"
                    placeholderTextColor="#666"
                    value={linkTitle}
                    onChangeText={setLinkTitle}
                  />

                  <Text style={styles.inputLabel}>CUSTOM ALIAS (OPTIONAL)</Text>
                  <View style={styles.aliasContainer}>
                    <Text style={styles.aliasPrefix}>cuttr.app/</Text>
                    <TextInput
                      style={styles.aliasInput}
                      placeholder="custom-slug"
                      placeholderTextColor="#666"
                      value={customAlias}
                      onChangeText={setCustomAlias}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                </>
              )}

              {shortenError ? (
                <Text style={styles.errorText}>{shortenError}</Text>
              ) : null}

              <TouchableOpacity
                style={[styles.primaryButton, isShortening && styles.disabledButton]}
                onPress={handleShorten}
                disabled={isShortening}
              >
                {isShortening ? (
                  <ActivityIndicator color="#000" size="small" />
                ) : (
                  <Text style={styles.primaryButtonText}>Shorten Now</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Result Card when a link was just created */}
            {createdLink && (
              <View style={styles.resultCard}>
                <Text style={styles.resultTitle}>Your Link is Ready!</Text>
                <Text style={styles.resultLinkText} numberOfLines={1}>
                  {createdLink.shortLink}
                </Text>

                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleCopy(createdLink.shortLink)}
                  >
                    <Text style={styles.actionButtonText}>Copy Link</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, styles.shareBtn]}
                    onPress={() => handleShare(createdLink)}
                  >
                    <Text style={styles.shareBtnText}>Share</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => setActiveQRModal(createdLink)}
                  >
                    <Text style={styles.actionButtonText}>QR Code</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Mobile Feature Highlights */}
            <View style={styles.featuresSection}>
              <View style={styles.featureItem}>
                <View style={styles.featureIconContainer}>
                  <Feather.Zap color="#ddb640" size={20} />
                </View>
                <View style={styles.featureTextWrapper}>
                  <Text style={styles.featureHeading}>Lightning Fast</Text>
                  <Text style={styles.featureSub}>
                    Instant redirect speed across iOS, Android and Web.
                  </Text>
                </View>
              </View>

              <View style={styles.featureItem}>
                <View style={styles.featureIconContainer}>
                  <Feather.BarChart2 color="#ddb640" size={20} />
                </View>
                <View style={styles.featureTextWrapper}>
                  <Text style={styles.featureHeading}>Live Analytics</Text>
                  <Text style={styles.featureSub}>
                    Accurate click count metrics recorded per link.
                  </Text>
                </View>
              </View>

              <View style={styles.featureItem}>
                <View style={styles.featureIconContainer}>
                  <Feather.Share2 color="#ddb640" size={20} />
                </View>
                <View style={styles.featureTextWrapper}>
                  <Text style={styles.featureHeading}>Native Mobile Sharing</Text>
                  <Text style={styles.featureSub}>
                    One-tap sharing to WhatsApp, Messages, Twitter, and more.
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* ==================== DASHBOARD TAB ==================== */}
        {currentTab === 'dashboard' && (
          <View style={styles.tabContent}>
            <View style={styles.dashboardHeader}>
              <View>
                <Text style={styles.screenHeading}>My Links</Text>
                <Text style={styles.screenSub}>
                  {user ? `Logged in as ${user.displayName || user.email}` : 'Sign in to sync your links'}
                </Text>
              </View>
            </View>

            {!user ? (
              <View style={styles.emptyStateCard}>
                <Feather.Lock color="#ddb640" size={36} />
                <Text style={styles.emptyTitle}>Account Required</Text>
                <Text style={styles.emptySubtitle}>
                  Sign in or create a free account to view and manage your saved links.
                </Text>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={() => {
                    setAuthMode('signin');
                    setShowAuthModal(true);
                  }}
                >
                  <Text style={styles.primaryButtonText}>Sign In / Sign Up</Text>
                </TouchableOpacity>
              </View>
            ) : isLoadingLinks ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color="#ddb640" size="large" />
                <Text style={styles.loadingText}>Fetching links...</Text>
              </View>
            ) : links.length === 0 ? (
              <View style={styles.emptyStateCard}>
                <Feather.Link2 color="#a3a3a3" size={40} />
                <Text style={styles.emptyTitle}>No Links Yet</Text>
                <Text style={styles.emptySubtitle}>
                  Shorten your first URL to view clicks, manage aliases, and generate QR codes.
                </Text>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={() => setCurrentTab('home')}
                >
                  <Text style={styles.primaryButtonText}>Create Short Link</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.linkList}>
                {links.map((item) => (
                  <View key={item.id} style={styles.linkCard}>
                    <View style={styles.linkCardHeader}>
                      <Text style={styles.linkCardTitle} numberOfLines={1}>
                        {item.linkName || 'Untitled Link'}
                      </Text>
                      <View style={styles.clickBadge}>
                        <Feather.Activity color="#ddb640" size={12} />
                        <Text style={styles.clickBadgeText}>{item.timesClicked} clicks</Text>
                      </View>
                    </View>

                    <Text style={styles.linkUrlLabel}>DESTINATION</Text>
                    <Text style={styles.destinationText} numberOfLines={1}>
                      {item.url}
                    </Text>

                    <Text style={styles.linkUrlLabel}>SHORT LINK</Text>
                    <Text style={styles.shortLinkText} numberOfLines={1}>
                      {item.shortLink}
                    </Text>

                    {/* Quick Action Buttons */}
                    <View style={styles.cardButtonRow}>
                      <TouchableOpacity
                        style={styles.cardActionButton}
                        onPress={() => handleCopy(item.shortLink)}
                      >
                        <Feather.Copy color="#fafafa" size={14} />
                        <Text style={styles.cardActionText}>Copy</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.cardActionButton, styles.cardShareButton]}
                        onPress={() => handleShare(item)}
                      >
                        <Feather.Share2 color="#000" size={14} />
                        <Text style={styles.cardShareText}>Share</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.cardActionButton}
                        onPress={() => setActiveQRModal(item)}
                      >
                        <Feather.Grid color="#fafafa" size={14} />
                        <Text style={styles.cardActionText}>QR</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.cardActionButton}
                        onPress={() => {
                          setEditingLink(item);
                          setEditUrlInput(item.url);
                        }}
                      >
                        <Feather.Edit2 color="#fafafa" size={14} />
                        <Text style={styles.cardActionText}>Edit</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.cardActionButton, styles.deleteBtn]}
                        onPress={() => handleDeleteLink(item.id)}
                      >
                        <Feather.Trash2 color="#ef4444" size={14} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* ==================== SETTINGS TAB ==================== */}
        {currentTab === 'settings' && (
          <View style={styles.tabContent}>
            <Text style={styles.screenHeading}>Settings</Text>
            <Text style={styles.screenSub}>Manage your account and mobile preferences</Text>

            {user ? (
              <>
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Profile Information</Text>

                  <Text style={styles.inputLabel}>DISPLAY NAME</Text>
                  <TextInput
                    style={styles.input}
                    value={settingsName}
                    onChangeText={setSettingsName}
                    placeholder="Your Name"
                    placeholderTextColor="#666"
                  />

                  <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
                  <TextInput
                    style={[styles.input, styles.disabledInput]}
                    value={user.email || ''}
                    editable={false}
                  />

                  {settingsSaved && (
                    <Text style={styles.successText}>Profile updated successfully!</Text>
                  )}

                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={handleUpdateSettingsProfile}
                  >
                    <Text style={styles.primaryButtonText}>Save Changes</Text>
                  </TouchableOpacity>
                </View>

                {/* Mobile Engine Info */}
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Mobile Architecture</Text>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Framework</Text>
                    <Text style={styles.infoValue}>Expo &amp; React Native</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>SDK Version</Text>
                    <Text style={styles.infoValue}>Expo SDK 51</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Platforms</Text>
                    <Text style={styles.infoValue}>iOS / Android / Web</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Build Configuration</Text>
                    <Text style={styles.infoValue}>EAS Ready (app.json / eas.json)</Text>
                  </View>
                </View>

                {/* Sign Out Button */}
                <TouchableOpacity
                  style={styles.signOutButton}
                  onPress={async () => {
                    await signOut(auth);
                    setCurrentTab('home');
                  }}
                >
                  <Feather.LogOut color="#ff4444" size={18} />
                  <Text style={styles.signOutButtonText}>Sign Out</Text>
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.emptyStateCard}>
                <Feather.User color="#ddb640" size={36} />
                <Text style={styles.emptyTitle}>Not Signed In</Text>
                <Text style={styles.emptySubtitle}>
                  Sign in to customize your profile and sync your links across mobile devices.
                </Text>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={() => {
                    setAuthMode('signin');
                    setShowAuthModal(true);
                  }}
                >
                  <Text style={styles.primaryButtonText}>Sign In Now</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* ==================== BOTTOM TAB BAR ==================== */}
      <View style={styles.bottomTabBar}>
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setCurrentTab('home')}
        >
          <Feather.Home
            color={currentTab === 'home' ? '#ddb640' : '#888'}
            size={22}
          />
          <Text
            style={[
              styles.tabLabel,
              currentTab === 'home' && styles.tabLabelActive,
            ]}
          >
            Home
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => {
            setCurrentTab('home');
          }}
        >
          <View style={styles.centerActionTab}>
            <Feather.Plus color="#000" size={24} />
          </View>
          <Text style={styles.tabLabel}>Shorten</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setCurrentTab('dashboard')}
        >
          <Feather.PieChart
            color={currentTab === 'dashboard' ? '#ddb640' : '#888'}
            size={22}
          />
          <Text
            style={[
              styles.tabLabel,
              currentTab === 'dashboard' && styles.tabLabelActive,
            ]}
          >
            Dashboard
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setCurrentTab('settings')}
        >
          <Feather.Settings
            color={currentTab === 'settings' ? '#ddb640' : '#888'}
            size={22}
          />
          <Text
            style={[
              styles.tabLabel,
              currentTab === 'settings' && styles.tabLabelActive,
            ]}
          >
            Settings
          </Text>
        </TouchableOpacity>
      </View>

      {/* ==================== QR MODAL ==================== */}
      <Modal
        visible={!!activeQRModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setActiveQRModal(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.qrModalContainer}>
            <View style={styles.qrModalHeader}>
              <Text style={styles.qrModalTitle}>QR Code</Text>
              <TouchableOpacity onPress={() => setActiveQRModal(null)}>
                <Feather.X color="#fff" size={22} />
              </TouchableOpacity>
            </View>

            {activeQRModal && (
              <>
                <Text style={styles.qrModalSubtitle} numberOfLines={1}>
                  {activeQRModal.linkName || activeQRModal.shortLink}
                </Text>

                <View style={styles.qrImageWrapper}>
                  <img
                    src={activeQRModal.qrCodeData || generateQrUrl(activeQRModal.shortLink)}
                    alt="QR Code"
                    style={{ width: 200, height: 200, borderRadius: 8 }}
                  />
                </View>

                <Text style={styles.qrModalShortLink} numberOfLines={1}>
                  {activeQRModal.shortLink}
                </Text>

                <View style={styles.modalButtonRow}>
                  <TouchableOpacity
                    style={styles.modalPrimaryBtn}
                    onPress={() => handleShare(activeQRModal)}
                  >
                    <Text style={styles.modalPrimaryBtnText}>Share Link</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.modalSecondaryBtn}
                    onPress={() => setActiveQRModal(null)}
                  >
                    <Text style={styles.modalSecondaryBtnText}>Done</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ==================== EDIT URL MODAL ==================== */}
      <Modal
        visible={!!editingLink}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setEditingLink(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.editModalContainer}>
            <View style={styles.qrModalHeader}>
              <Text style={styles.qrModalTitle}>Edit Destination</Text>
              <TouchableOpacity onPress={() => setEditingLink(null)}>
                <Feather.X color="#fff" size={22} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>NEW DESTINATION URL</Text>
            <TextInput
              style={styles.input}
              value={editUrlInput}
              onChangeText={setEditUrlInput}
              autoCapitalize="none"
              keyboardType="url"
            />

            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={styles.modalPrimaryBtn}
                onPress={handleSaveEdit}
              >
                <Text style={styles.modalPrimaryBtnText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSecondaryBtn}
                onPress={() => setEditingLink(null)}
              >
                <Text style={styles.modalSecondaryBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ==================== AUTH MODAL ==================== */}
      <Modal
        visible={showAuthModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAuthModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.authModalContainer}>
            <View style={styles.qrModalHeader}>
              <Text style={styles.qrModalTitle}>
                {authMode === 'signin' ? 'Sign In to Cuttr' : 'Create an Account'}
              </Text>
              <TouchableOpacity onPress={() => setShowAuthModal(false)}>
                <Feather.X color="#fff" size={22} />
              </TouchableOpacity>
            </View>

            {authMode === 'signup' && (
              <>
                <Text style={styles.inputLabel}>FULL NAME</Text>
                <TextInput
                  style={styles.input}
                  placeholder="John Doe"
                  placeholderTextColor="#666"
                  value={authName}
                  onChangeText={setAuthName}
                />
              </>
            )}

            <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
            <TextInput
              style={styles.input}
              placeholder="user@example.com"
              placeholderTextColor="#666"
              value={authEmail}
              onChangeText={setAuthEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <Text style={styles.inputLabel}>PASSWORD</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor="#666"
              secureTextEntry
              value={authPassword}
              onChangeText={setAuthPassword}
            />

            {authError ? <Text style={styles.errorText}>{authError}</Text> : null}

            <TouchableOpacity
              style={[styles.primaryButton, isAuthLoading && styles.disabledButton]}
              onPress={handleAuthSubmit}
              disabled={isAuthLoading}
            >
              {isAuthLoading ? (
                <ActivityIndicator color="#000" size="small" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {authMode === 'signin' ? 'Sign In' : 'Create Account'}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toggleAuthBtn}
              onPress={() => {
                setAuthError('');
                setAuthMode(authMode === 'signin' ? 'signup' : 'signin');
              }}
            >
              <Text style={styles.toggleAuthText}>
                {authMode === 'signin'
                  ? "Don't have an account? Sign Up"
                  : 'Already have an account? Sign In'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Copy Toast */}
      {copiedToast && (
        <View style={styles.toastContainer}>
          <Feather.Check color="#000" size={16} />
          <Text style={styles.toastText}>Copied to clipboard!</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

export default CuttrMobileApp;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#050505',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: '#050505',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ddb640',
    letterSpacing: -0.5,
  },
  logoDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#facc15',
    marginHorizontal: 6,
  },
  mobileBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#050505',
    backgroundColor: '#ddb640',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    letterSpacing: 0.5,
  },
  headerAuthButton: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: 'rgba(221, 182, 64, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(221, 182, 64, 0.3)',
  },
  headerAuthButtonText: {
    color: '#ddb640',
    fontSize: 12,
    fontWeight: '600',
  },
  userBadge: {
    padding: 2,
  },
  avatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#ddb640',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: '#050505',
    fontSize: 15,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 90,
  },
  tabContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  heroCard: {
    marginBottom: 20,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    lineHeight: 34,
  },
  heroTitleGold: {
    color: '#ddb640',
  },
  heroSubtitle: {
    fontSize: 14,
    color: '#a3a3a3',
    marginTop: 8,
    lineHeight: 20,
  },
  card: {
    backgroundColor: '#121212',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#a3a3a3',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#ffffff',
    marginBottom: 14,
  },
  disabledInput: {
    opacity: 0.6,
  },
  aliasContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  aliasPrefix: {
    color: '#a3a3a3',
    fontSize: 13,
  },
  aliasInput: {
    flex: 1,
    paddingVertical: 12,
    paddingLeft: 4,
    fontSize: 14,
    color: '#ffffff',
  },
  primaryButton: {
    backgroundColor: '#ddb640',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  primaryButtonText: {
    color: '#050505',
    fontSize: 15,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.6,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginBottom: 10,
  },
  successText: {
    color: '#10b981',
    fontSize: 12,
    marginBottom: 10,
  },
  resultCard: {
    backgroundColor: 'rgba(221, 182, 64, 0.08)',
    borderColor: 'rgba(221, 182, 64, 0.3)',
    borderWidth: 1,
    borderRadius: 18,
    padding: 18,
    marginBottom: 20,
    alignItems: 'center',
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ddb640',
    marginBottom: 6,
  },
  resultLinkText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 16,
    textAlign: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
  },
  actionButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  shareBtn: {
    backgroundColor: '#ddb640',
    borderColor: '#ddb640',
  },
  shareBtnText: {
    color: '#050505',
    fontSize: 13,
    fontWeight: '700',
  },
  featuresSection: {
    marginTop: 10,
    gap: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121212',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  featureIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(221, 182, 64, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  featureTextWrapper: {
    flex: 1,
  },
  featureHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 2,
  },
  featureSub: {
    fontSize: 12,
    color: '#a3a3a3',
    lineHeight: 16,
  },
  dashboardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  screenHeading: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
  },
  screenSub: {
    fontSize: 13,
    color: '#a3a3a3',
    marginTop: 2,
  },
  emptyStateCard: {
    backgroundColor: '#121212',
    borderRadius: 18,
    padding: 30,
    alignItems: 'center',
    textAlign: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 14,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#a3a3a3',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  loadingContainer: {
    paddingVertical: 50,
    alignItems: 'center',
  },
  loadingText: {
    color: '#a3a3a3',
    marginTop: 12,
    fontSize: 13,
  },
  linkList: {
    gap: 14,
  },
  linkCard: {
    backgroundColor: '#121212',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  linkCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  linkCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    flex: 1,
    marginRight: 10,
  },
  clickBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(221, 182, 64, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  clickBadgeText: {
    color: '#ddb640',
    fontSize: 11,
    fontWeight: '700',
  },
  linkUrlLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#666',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  destinationText: {
    fontSize: 12,
    color: '#a3a3a3',
    marginBottom: 6,
  },
  shortLinkText: {
    fontSize: 14,
    color: '#ddb640',
    fontWeight: '600',
    marginBottom: 14,
  },
  cardButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    paddingTop: 12,
  },
  cardActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  cardActionText: {
    color: '#fafafa',
    fontSize: 12,
    fontWeight: '600',
  },
  cardShareButton: {
    backgroundColor: '#ddb640',
  },
  cardShareText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '700',
  },
  deleteBtn: {
    marginLeft: 'auto',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  infoLabel: {
    fontSize: 13,
    color: '#a3a3a3',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.25)',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    marginTop: 10,
    marginBottom: 30,
  },
  signOutButtonText: {
    color: '#ff5555',
    fontSize: 15,
    fontWeight: '700',
  },
  bottomTabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 70,
    backgroundColor: '#0a0a0a',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: 6,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 6,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: '#888',
    marginTop: 3,
  },
  tabLabelActive: {
    color: '#ddb640',
    fontWeight: '700',
  },
  centerActionTab: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ddb640',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -16,
    shadowColor: '#ddb640',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  qrModalContainer: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#121212',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  qrModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 12,
  },
  qrModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  qrModalSubtitle: {
    fontSize: 13,
    color: '#a3a3a3',
    marginBottom: 14,
  },
  qrImageWrapper: {
    padding: 12,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    marginBottom: 14,
  },
  qrModalShortLink: {
    fontSize: 13,
    color: '#ddb640',
    fontWeight: '600',
    marginBottom: 16,
  },
  modalButtonRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  modalPrimaryBtn: {
    flex: 1,
    backgroundColor: '#ddb640',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalPrimaryBtnText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 13,
  },
  modalSecondaryBtn: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalSecondaryBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  editModalContainer: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#121212',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  authModalContainer: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#121212',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  toggleAuthBtn: {
    marginTop: 16,
    alignItems: 'center',
  },
  toggleAuthText: {
    color: '#ddb640',
    fontSize: 13,
    fontWeight: '500',
  },
  toastContainer: {
    position: 'absolute',
    top: 50,
    alignSelf: 'center',
    backgroundColor: '#ddb640',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  toastText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '700',
  },
});
