import React, { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';

interface User {
  id: string;
  username: string;
  handle: string;
  avatar: string;
  verified: boolean;
}

interface Tweet {
  id: string;
  userId: string;
  content: string;
  likes: number;
  retweets: number;
  replies: number;
  timeAgo: string;
  images?: string[];
}

type TabType = 'forYou' | 'following';

interface PageData {
  page: number;
  hasMore: boolean;
}

const App: React.FC = () => {
  // State for users and following system
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allTweets, setAllTweets] = useState<Tweet[]>([]);
  const [followedUsers, setFollowedUsers] = useState<Set<string>>(new Set());
  const followedUsersRef = useRef<Set<string>>(followedUsers);
  
  // State for tweets
  const [forYouTweets, setForYouTweets] = useState<Tweet[]>([]);
  const [followingTweets, setFollowingTweets] = useState<Tweet[]>([]);
  
  // UI state
  const [loading, setLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<TabType>('forYou');
  const observer = useRef<IntersectionObserver | null>(null);
  
  // Pagination state
  const [pageData, setPageData] = useState<Record<TabType, PageData>>({
    forYou: { page: 1, hasMore: true },
    following: { page: 1, hasMore: true }
  });

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load users
        const usersResponse = await fetch('/users.json');
        const usersData: User[] = await usersResponse.json();
        setAllUsers(usersData);
        
        // Follow first 10 users by default
        const initialFollowed = new Set(usersData.slice(0, 10).map(u => u.id));
        setFollowedUsers(initialFollowed);
        followedUsersRef.current = initialFollowed;

        // Load tweets
        const tweetsResponse = await fetch('/tweets.json');
        const tweetsData: Tweet[] = await tweetsResponse.json();
        setAllTweets(tweetsData);
        
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };
    
    loadData();
  }, []);

  // Update ref when followedUsers changes
  useEffect(() => {
    followedUsersRef.current = followedUsers;
  }, [followedUsers]);

  // Fetch tweets for current tab
  const fetchTweets = useCallback(async (tab: TabType) => {
    const currentPage = pageData[tab].page;
    const hasMore = pageData[tab].hasMore;
    
    if (loading || !hasMore) return;
    
    setLoading(true);
    
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Filter tweets based on tab
      const filteredTweets = tab === 'following' 
        ? allTweets.filter(t => followedUsersRef.current.has(t.userId))
        : allTweets;

      // Paginate results
      const startIndex = (currentPage - 1) * 10;
      const newTweets = filteredTweets.slice(startIndex, startIndex + 10);

      if (tab === 'following') {
        setFollowingTweets(prev => [...prev, ...newTweets]);
        setPageData(prev => ({
          ...prev,
          following: {
            page: currentPage + 1,
            hasMore: filteredTweets.length > startIndex + 10
          }
        }));
      } else {
        setForYouTweets(prev => [...prev, ...newTweets]);
        setPageData(prev => ({
          ...prev,
          forYou: {
            page: currentPage + 1,
            hasMore: filteredTweets.length > startIndex + 10
          }
        }));
      }
    } finally {
      setLoading(false);
    }
  }, [loading, pageData, allTweets, activeTab]);

  // Infinite scroll observer
  const lastTweetRef = useCallback((node: HTMLDivElement | null) => {
    if (loading || !pageData[activeTab].hasMore) return;
    
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        fetchTweets(activeTab);
      }
    }, { rootMargin: '200px' });
    
    if (node) observer.current.observe(node);
  }, [loading, fetchTweets, activeTab, pageData]);

  // Reset pagination when switching tabs
  useEffect(() => {
    setPageData({
      forYou: activeTab === 'forYou' ? { page: 1, hasMore: true } : pageData.forYou,
      following: activeTab === 'following' ? { page: 1, hasMore: true } : pageData.following
    });
    
    setForYouTweets([]);
    setFollowingTweets([]);
  }, [activeTab]);

  // Initial load
  useEffect(() => {
    if (allTweets.length > 0) {
      if (activeTab === 'forYou' && forYouTweets.length === 0) {
        fetchTweets('forYou');
      } else if (activeTab === 'following' && followingTweets.length === 0) {
        fetchTweets('following');
      }
    }
  }, [activeTab, allTweets, fetchTweets]);

  // Format large numbers
  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  // Get current tweets and user data
  const currentTweets = activeTab === 'forYou' ? forYouTweets : followingTweets;
  const getUserById = (userId: string): User | undefined => allUsers.find(u => u.id === userId);

  return (
    <div className="twitter-app">
      <header className="app-header">
        <div className="header-content">
          <h1>Inicio</h1>
          <div className="tabs">
            <button 
              className={`tab ${activeTab === 'forYou' ? 'active' : ''}`}
              onClick={() => setActiveTab('forYou')}
              disabled={loading}
            >
              Para ti
            </button>
            <button 
              className={`tab ${activeTab === 'following' ? 'active' : ''}`}
              onClick={() => setActiveTab('following')}
              disabled={loading}
            >
              Siguiendo
            </button>
          </div>
        </div>
      </header>

      <main className="tweet-feed">
        {currentTweets.map((tweet, index) => {
          const user = getUserById(tweet.userId);
          if (!user) return null;
          
          const isFollowing = followedUsers.has(user.id);
          
          return (
            <div 
              key={tweet.id}
              ref={index === currentTweets.length - 1 ? lastTweetRef : null}
              className="tweet-container"
            >
              <div className="tweet">
                <div className="tweet-avatar-container">
                  <img src={user.avatar} alt="Avatar" className="tweet-avatar" />
                </div>
                
                <div className="tweet-content">
                  <div className="tweet-header">
                    <div className="tweet-user">
                      <span className="tweet-username">
                        {user.username}
                        {user.verified && (
                          <svg className="verified-badge" viewBox="0 0 24 24">
                            <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334l-4.334 6.5c-.145.217-.382.334-.625.334-.143 0-.288-.04-.416-.126l-.115-.094-2.415-2.415c-.293-.293-.293-.768 0-1.06s.768-.294 1.06 0l1.77 1.767 3.825-5.74c.23-.345.696-.436 1.04-.207.346.23.44.696.21 1.04z" fill="currentColor"/>
                          </svg>
                        )}
                      </span>
                      <span className="tweet-handle">@{user.handle}</span>
                      <span className="tweet-time">· {tweet.timeAgo}</span>
                      {isFollowing && (
                        <span className="following-badge">Siguiendo</span>
                      )}
                    </div>
                    <button className="tweet-more">
                      <svg viewBox="0 0 24 24">
                        <path d="M3 12c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2zm9 2c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm7 0c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z" fill="currentColor"/>
                      </svg>
                    </button>
                  </div>
                  
                  <div className="tweet-text">{tweet.content}</div>
                  
                  {tweet.images && (
                    <div className={`tweet-media ${tweet.images.length > 1 ? 'grid' : ''}`}>
                      {tweet.images.map((img, i) => (
                        <img key={i} src={img} alt="" className="tweet-image" />
                      ))}
                    </div>
                  )}
                  
                  <div className="tweet-actions">
                    <button className="tweet-action reply">
                      <svg viewBox="0 0 24 24">
                        <path d="M1.751 10c0-4.42 3.584-8 8.005-8h4.366c4.49 0 8.129 3.64 8.129 8.13 0 2.96-1.607 5.68-4.196 7.11l-8.054 4.46v-3.69h-.067c-4.49.1-8.183-3.51-8.183-8.01zm8.005-6c-3.317 0-6.005 2.69-6.005 6 0 3.37 2.77 6.08 6.138 6.01l.351-.01h1.761v2.3l5.087-2.81c1.951-1.08 3.163-3.13 3.163-5.36 0-3.39-2.744-6.13-6.129-6.13H9.756z" fill="currentColor"/>
                      </svg>
                      <span>{formatNumber(tweet.replies)}</span>
                    </button>
                    
                    <button className="tweet-action retweet">
                      <svg viewBox="0 0 24 24">
                        <path d="M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2H13v2H7.5c-2.209 0-4-1.79-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88zM16.5 6H11V4h5.5c2.209 0 4 1.79 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14-4.432-4.14 1.364-1.46 2.068 1.93V8c0-1.1-.896-2-2-2z" fill="currentColor"/>
                      </svg>
                      <span>{formatNumber(tweet.retweets)}</span>
                    </button>
                    
                    <button className="tweet-action like">
                      <svg viewBox="0 0 24 24">
                        <path d="M16.697 5.5c-1.222-.06-2.679.51-3.89 2.16l-.805 1.09-.806-1.09C9.984 6.01 8.526 5.44 7.304 5.5c-1.243.07-2.349.78-2.91 1.91-.552 1.12-.633 2.78.479 4.82 1.074 1.97 3.257 4.27 7.129 6.61 3.87-2.34 6.052-4.64 7.126-6.61 1.111-2.04 1.03-3.7.477-4.82-.561-1.13-1.666-1.84-2.908-1.91zm4.187 7.69c-1.351 2.48-4.001 5.12-8.379 7.67l-.503.3-.504-.3c-4.379-2.55-7.029-5.19-8.382-7.67-1.36-2.5-1.41-4.86-.514-6.67.887-1.79 2.647-2.91 4.601-3.01 1.651-.09 3.368.56 4.798 2.01 1.429-1.45 3.146-2.1 4.796-2.01 1.954.1 3.714 1.22 4.601 3.01.896 1.81.846 4.17-.514 6.67z" fill="currentColor"/>
                      </svg>
                      <span>{formatNumber(tweet.likes)}</span>
                    </button>
                    
                    <button className="tweet-action share">
                      <svg viewBox="0 0 24 24">
                        <path d="M12 2.59l5.7 5.7-1.41 1.42L13 6.41V16h-2V6.41l-3.3 3.3-1.41-1.42L12 2.59zM21 15l-.02 3.51c0 1.38-1.12 2.49-2.5 2.49H5.5C4.11 21 3 19.88 3 18.5V15h2v3.5c0 .28.22.5.5.5h12.98c.28 0 .5-.22.5-.5L19 15h2z" fill="currentColor"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        
        {loading && (
          <div className="loading-indicator">
            <div className="spinner"></div>
          </div>
        )}
        
        {!pageData[activeTab].hasMore && (
          <div className="end-indicator">
            {activeTab === 'forYou' 
              ? 'No hay más tweets recomendados' 
              : followingTweets.length === 0
                ? 'No sigues a ningún usuario'
                : 'Has visto todos los tweets de las cuentas que sigues'}
          </div>
        )}
      </main>

      <button className="floating-tweet-button">
        <svg viewBox="0 0 24 24">
          <path d="M23 3c-6.62-.1-10.38 2.421-13.05 6.03C7.29 12.61 6 17.331 6 22h2c0-1.007.07-2.012.19-3H12c4.1 0 7.48-3.082 7.94-7.054C22.79 10.147 23.17 6.359 23 3zm-7 8h-1.5v2H16c.63-.016 1.2-.08 1.72-.188C16.95 15.24 14.68 17 12 17H8.55c.57-2.512 1.57-4.851 3-6.78 2.16-2.912 5.29-4.911 9.45-5.187C20.95 8.079 19.9 11 16 11zM4 9V6H1V4h3V1h2v3h3v2H6v3H4z"/>
        </svg>
      </button>
    </div>
  );
};

export default App;