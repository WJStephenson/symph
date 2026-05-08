export type JellyfinSession = {
  serverUrl: string;
  accessToken: string;
  userId: string;
  userName: string;
  deviceId: string;
};

export type BaseItemDto = {
  Id: string;
  Name?: string;
  Type?: string;
  PlaylistItemId?: string;
  CollectionType?: string;
  ParentId?: string;
  AlbumId?: string;
  ParentPrimaryImageItemId?: string;
  AlbumArtist?: string;
  AlbumArtists?: { Name?: string; Id?: string }[];
  Artists?: { Name?: string; Id?: string }[];
  ProductionYear?: number;
  RunTimeTicks?: number;
  IndexNumber?: number;
  ImageTags?: Record<string, string>;
  UserData?: {
    PlaybackPositionTicks?: number;
    PlayedPercentage?: number;
    IsFavorite?: boolean;
  };
};

export type ItemsResponse = {
  Items?: BaseItemDto[];
  TotalRecordCount?: number;
};

export type AuthResponse = {
  AccessToken?: string;
  User?: { Id?: string; Name?: string };
};
