USE [Synctime]
GO
/****** Object:  Table [dbo].[AutoLoadErr]    Script Date: 26-06-2018 1:42:34 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[AutoLoadErr](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[machineno] [int] NULL,
	[errmsg] [nvarchar](max) NULL,
	[errdate] [datetime] NULL,
	[machinename] [nvarchar](max) NULL,
	[errcode] [nvarchar](50) NULL,
 CONSTRAINT [PK_AutoDownLoadErr] PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]

GO
/****** Object:  Table [dbo].[AutoLoadTime]    Script Date: 26-06-2018 1:42:34 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[AutoLoadTime](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[loadtime] [nvarchar](10) NULL,
 CONSTRAINT [PK_AutoLoadTime] PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]

GO
/****** Object:  Table [dbo].[Branch]    Script Date: 26-06-2018 1:42:34 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Branch](
	[branchid] [int] IDENTITY(1,1) NOT NULL,
	[branchcode] [nvarchar](50) NULL,
	[branchname] [nvarchar](250) NULL,
	[active] [bit] NULL,
 CONSTRAINT [PK_Branch] PRIMARY KEY CLUSTERED 
(
	[branchid] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]

GO
/****** Object:  Table [dbo].[Classes]    Script Date: 26-06-2018 1:42:34 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Classes](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[classcode] [nvarchar](50) NULL,
	[classname] [nvarchar](250) NULL,
	[levelcode] [nvarchar](50) NULL,
	[active] [bit] NULL
) ON [PRIMARY]

GO
/****** Object:  Table [dbo].[ExportFormat]    Script Date: 26-06-2018 1:42:34 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[ExportFormat](
	[filetype] [nvarchar](50) NULL,
	[symbol] [nvarchar](50) NULL,
	[qty] [int] NULL,
	[usesymbolflg] [int] NULL,
	[saveflg] [int] NULL,
	[savelocation] [nvarchar](250) NULL,
	[dateformat] [nvarchar](50) NULL,
	[openflg] [int] NULL,
	[rpt1field] [nvarchar](250) NULL,
	[rpt2field] [nvarchar](250) NULL,
	[rpt3field] [nvarchar](250) NULL,
	[rpt4field] [nvarchar](250) NULL,
	[rpt5field] [nvarchar](250) NULL,
	[rpt6field] [nvarchar](250) NULL,
	[rpt7field] [nvarchar](250) NULL,
	[rpt8field] [nvarchar](250) NULL,
	[rpt9field] [nvarchar](250) NULL,
	[rpt10field] [nvarchar](250) NULL,
	[rpt11field] [nvarchar](250) NULL,
	[rpt12field] [nvarchar](250) NULL,
	[rpt13field] [nvarchar](250) NULL,
	[rpt14field] [nvarchar](250) NULL,
	[rpt15field] [nvarchar](250) NULL,
	[eachfieldlenflg] [int] NULL,
	[rptfield1len] [nvarchar](250) NULL,
	[rptfield2len] [nvarchar](250) NULL,
	[rptfield3len] [nvarchar](250) NULL,
	[rptfield4len] [nvarchar](250) NULL,
	[rptfield5len] [nvarchar](250) NULL,
	[rptfield6len] [nvarchar](250) NULL,
	[rptfield7len] [nvarchar](250) NULL,
	[rptfield8len] [nvarchar](250) NULL,
	[rptfield9len] [nvarchar](250) NULL,
	[rptfield10len] [nvarchar](250) NULL,
	[rptfield11len] [nvarchar](250) NULL,
	[rptfield12len] [nvarchar](250) NULL,
	[rptfield13len] [nvarchar](250) NULL,
	[rptfield14len] [nvarchar](250) NULL,
	[rptfield15len] [nvarchar](250) NULL
) ON [PRIMARY]

GO
/****** Object:  Table [dbo].[Holiday]    Script Date: 26-06-2018 1:42:34 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Holiday](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[holdate] [datetime] NULL,
	[holreason] [nvarchar](max) NULL,
 CONSTRAINT [PK_Holiday] PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]

GO
/****** Object:  Table [dbo].[Leave]    Script Date: 26-06-2018 1:42:34 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Leave](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[leavecode] [nvarchar](50) NULL,
	[leavename] [nvarchar](200) NULL,
 CONSTRAINT [PK_Leave] PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]

GO
/****** Object:  Table [dbo].[Level]    Script Date: 26-06-2018 1:42:34 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Level](
	[levelid] [int] IDENTITY(1,1) NOT NULL,
	[levelcode] [nvarchar](50) NULL,
	[levelname] [nvarchar](250) NULL,
	[linetokenaccess] [nvarchar](250) NULL,
	[fullqty] [int] NULL,
	[comeqty] [int] NULL,
	[active] [bit] NULL,
 CONSTRAINT [PK_level] PRIMARY KEY CLUSTERED 
(
	[levelid] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]

GO
/****** Object:  Table [dbo].[Machine]    Script Date: 26-06-2018 1:42:34 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Machine](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[machineno] [int] NULL,
	[machinename] [nvarchar](100) NULL,
	[ip] [nvarchar](50) NULL,
	[port] [nvarchar](50) NULL,
	[password] [nvarchar](250) NULL,
	[modelcode] [nvarchar](50) NULL,
	[autodownloadtype] [int] NULL,
	[snno] [nvarchar](150) NULL,
 CONSTRAINT [PK_Machine] PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]

GO
/****** Object:  Table [dbo].[MachineModel]    Script Date: 26-06-2018 1:42:34 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[MachineModel](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[modelcode] [nvarchar](50) NULL,
	[fingerflg] [int] NULL,
	[cardflg] [int] NULL,
	[faceflg] [int] NULL,
	[qtyrecord] [int] NULL,
	[doorflg] [int] NULL,
 CONSTRAINT [PK_MqachineModel] PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]

GO
/****** Object:  Table [dbo].[repport]    Script Date: 26-06-2018 1:42:34 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[repport](
	[rep01] [nvarchar](150) NULL,
	[rep02] [nvarchar](150) NULL,
	[rep03] [nvarchar](150) NULL,
	[rep04] [nvarchar](150) NULL,
	[rep05] [nvarchar](150) NULL,
	[rep06] [nvarchar](150) NULL,
	[rep07] [nvarchar](150) NULL,
	[rep08] [nvarchar](150) NULL,
	[rep09] [nvarchar](150) NULL,
	[rep10] [nvarchar](150) NULL,
	[rep11] [nvarchar](150) NULL,
	[rep12] [nvarchar](150) NULL
) ON [PRIMARY]

GO
/****** Object:  Table [dbo].[School]    Script Date: 26-06-2018 1:42:34 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[School](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[systemname] [nvarchar](150) NULL,
	[schoolcode] [nvarchar](50) NULL,
	[schoolname] [nvarchar](250) NULL,
	[address1] [nvarchar](250) NULL,
	[address2] [nvarchar](250) NULL,
	[province] [nvarchar](250) NULL,
	[zipcode] [nvarchar](50) NULL,
	[starttime] [nvarchar](50) NULL,
	[endtime] [nvarchar](50) NULL,
	[satwork] [int] NULL,
	[sunwork] [int] NULL,
	[autodownload] [int] NULL,
	[autosendsms] [int] NULL,
	[sendpicflg] [int] NULL,
	[intervalmachine] [int] NULL,
	[smslimittime] [int] NULL,
	[smsprefix] [nvarchar](250) NULL,
	[sendaslevel] [int] NULL,
	[linetokenaccess] [nvarchar](250) NULL,
	[intervaltime] [int] NULL,
	[active] [bit] NULL,
	[usephotosendsms] [int] NULL,
	[emppictpath] [nvarchar](250) NULL,
	[webunique] [nvarchar](max) NULL,
 CONSTRAINT [PK_School] PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]

GO
/****** Object:  Table [dbo].[Shift]    Script Date: 26-06-2018 1:42:34 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Shift](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[shiftcode] [nvarchar](50) NULL,
	[shiftname] [nvarchar](150) NULL,
	[starttime] [nvarchar](50) NULL,
	[endtime] [nvarchar](50) NULL,
	[bst] [nvarchar](50) NULL,
	[bet] [nvarchar](50) NULL,
	[lst] [nvarchar](50) NULL,
	[let] [nvarchar](50) NULL,
	[est] [nvarchar](50) NULL,
	[otst] [nvarchar](50) NULL,
	[otet] [nvarchar](50) NULL,
 CONSTRAINT [PK_Shift] PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]

GO
/****** Object:  Table [dbo].[Student]    Script Date: 26-06-2018 1:42:34 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Student](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[studentcode] [nvarchar](50) NULL,
	[studentname] [nvarchar](250) NULL,
	[studentnamee] [nvarchar](250) NULL,
	[schoolcode] [nvarchar](50) NULL,
	[levelcode] [nvarchar](50) NULL,
	[enrollnumber] [int] NULL,
	[mobilerecvmsg] [nvarchar](250) NULL,
	[cardno] [nvarchar](50) NULL,
	[studentdate] [nvarchar](50) NULL,
	[birthdate] [nvarchar](50) NULL,
	[address1] [nvarchar](250) NULL,
	[address2] [nvarchar](250) NULL,
	[province] [nvarchar](150) NULL,
	[mobile] [nvarchar](100) NULL,
	[idcard] [nvarchar](100) NULL,
	[issueby] [nvarchar](100) NULL,
	[passport] [nvarchar](100) NULL,
	[carlicence] [nvarchar](100) NULL,
	[motorlicence] [nvarchar](100) NULL,
	[shiftflg] [int] NULL,
	[shiftcode] [nvarchar](50) NULL,
	[branchcode] [nvarchar](50) NULL,
	[webusercode] [nvarchar](250) NULL,
	[active] [bit] NULL,
	[retiredate] [nvarchar](50) NULL,
 CONSTRAINT [PK_Student] PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]

GO
/****** Object:  Table [dbo].[StudentMachine]    Script Date: 26-06-2018 1:42:34 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
SET ANSI_PADDING ON
GO
CREATE TABLE [dbo].[StudentMachine](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[enrollnumber] [int] NULL,
	[machineno] [int] NULL,
	[fingerno] [int] NULL,
	[privilege] [int] NULL,
	[password] [int] NULL,
	[fpdata] [varbinary](max) NULL,
	[face] [varbinary](max) NULL,
 CONSTRAINT [PK_StudentMachine] PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]

GO
SET ANSI_PADDING OFF
GO
/****** Object:  Table [dbo].[StudentShift]    Script Date: 26-06-2018 1:42:34 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[StudentShift](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[enrollnumber] [int] NULL,
	[tdate] [nvarchar](20) NULL,
	[shiftcode] [nvarchar](50) NULL,
	[adddate] [datetime] NULL,
 CONSTRAINT [PK_StudentShift] PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]

GO
/****** Object:  Table [dbo].[StudentTime]    Script Date: 26-06-2018 1:42:34 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[StudentTime](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[enrollnumber] [int] NULL,
	[tdate] [nvarchar](20) NULL,
	[time01] [nvarchar](50) NULL,
	[time02] [nvarchar](50) NULL,
	[time03] [nvarchar](50) NULL,
	[time04] [nvarchar](50) NULL,
	[time05] [nvarchar](50) NULL,
	[time06] [nvarchar](50) NULL,
	[time07] [nvarchar](50) NULL,
	[time08] [nvarchar](50) NULL,
	[time09] [nvarchar](50) NULL,
	[time10] [nvarchar](50) NULL,
	[time11] [nvarchar](50) NULL,
	[time12] [nvarchar](50) NULL,
	[time13] [nvarchar](50) NULL,
	[time14] [nvarchar](50) NULL,
	[time15] [nvarchar](50) NULL,
	[time16] [nvarchar](50) NULL,
	[time17] [nvarchar](50) NULL,
	[time18] [nvarchar](50) NULL,
	[time19] [nvarchar](50) NULL,
	[time20] [nvarchar](50) NULL,
	[smstimes] [int] NULL,
	[editreason] [nvarchar](250) NULL,
 CONSTRAINT [PK_StudentTime] PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]

GO
/****** Object:  Table [dbo].[StudentTimeZone]    Script Date: 26-06-2018 1:42:34 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[StudentTimeZone](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[enrollnumber] [int] NULL,
	[machineno] [int] NULL,
	[suntimezoneno] [nvarchar](50) NULL,
	[montimezoneno] [nvarchar](50) NULL,
	[tuetimezoneno] [nvarchar](50) NULL,
	[wedtimezoneno] [nvarchar](50) NULL,
	[thutimezoneno] [nvarchar](50) NULL,
	[fritimezoneno] [nvarchar](50) NULL,
	[sattimezoneno] [nvarchar](50) NULL,
 CONSTRAINT [PK_StudentTimeZone] PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]

GO
/****** Object:  Table [dbo].[TimeZone]    Script Date: 26-06-2018 1:42:34 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[TimeZone](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[timezoneno] [nvarchar](50) NULL,
	[machineno] [int] NULL,
	[starttime1] [nvarchar](50) NULL,
	[endtime1] [nvarchar](50) NULL,
	[starttime2] [nvarchar](50) NULL,
	[endtime2] [nvarchar](50) NULL,
	[starttime3] [nvarchar](50) NULL,
	[endtime3] [nvarchar](50) NULL,
	[starttime4] [nvarchar](50) NULL,
	[endtime4] [nvarchar](50) NULL,
	[starttime5] [nvarchar](50) NULL,
	[endtime5] [nvarchar](50) NULL,
	[starttime6] [nvarchar](50) NULL,
	[endtime6] [nvarchar](50) NULL,
 CONSTRAINT [PK_TimeZone] PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]

GO
/****** Object:  Table [dbo].[TranLeave]    Script Date: 26-06-2018 1:42:34 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[TranLeave](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[studentcode] [nvarchar](50) NULL,
	[leavedate] [nvarchar](20) NULL,
	[leavecode] [nvarchar](50) NULL,
	[starttime] [nvarchar](50) NULL,
	[endtime] [nvarchar](50) NULL,
	[reason] [nvarchar](250) NULL,
 CONSTRAINT [PK_TranLeave] PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]

GO
/****** Object:  Table [dbo].[Transcantime]    Script Date: 26-06-2018 1:42:34 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Transcantime](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[enrollnumber] [int] NULL,
	[machineno] [int] NULL,
	[verifymode] [int] NULL,
	[verifymodestr] [nvarchar](50) NULL,
	[datetimescan] [nvarchar](50) NULL,
	[adddate] [datetime] NOT NULL,
	[sendsmsflg] [int] NULL,
	[sentsmsdate] [datetime] NULL,
	[sentremark] [nvarchar](250) NULL,
	[recordtostudent] [int] NULL,
	[timetype] [nvarchar](5) NULL,
	[webflg] [int] NULL,
 CONSTRAINT [PK_transcantime] PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]

GO
/****** Object:  Table [dbo].[TranscantimeBK]    Script Date: 26-06-2018 1:42:34 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[TranscantimeBK](
	[int] [int] IDENTITY(1,1) NOT NULL,
	[enrollnumber] [int] NULL,
	[machineno] [int] NULL,
	[verifymode] [int] NULL,
	[verifymodestr] [nvarchar](50) NULL,
	[datetimescan] [nvarchar](50) NULL,
	[adddate] [datetime] NULL,
	[sendsmsflg] [int] NULL,
	[sentsmsdate] [datetime] NULL,
	[sentremark] [nvarchar](250) NULL,
	[recordtostudent] [int] NULL,
	[timetype] [nvarchar](5) NULL,
	[webflg] [int] NULL,
 CONSTRAINT [PK_TranscantimeBK] PRIMARY KEY CLUSTERED 
(
	[int] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]

GO
/****** Object:  Table [dbo].[Users]    Script Date: 26-06-2018 1:42:34 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Users](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[usercode] [nvarchar](50) NULL,
	[username] [nvarchar](250) NULL,
	[usertype] [nvarchar](50) NULL,
	[password] [nvarchar](250) NULL,
 CONSTRAINT [PK_Users] PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]

GO
ALTER TABLE [dbo].[AutoLoadErr] ADD  CONSTRAINT [DF_AutoDownLoadErr_errdate]  DEFAULT (getdate()) FOR [errdate]
GO
ALTER TABLE [dbo].[AutoLoadTime] ADD  CONSTRAINT [DF_AutoLoadTime_loadtime]  DEFAULT (CONVERT([varchar](5),getdate(),(108))) FOR [loadtime]
GO
ALTER TABLE [dbo].[Branch] ADD  CONSTRAINT [DF_Branch_active]  DEFAULT ((1)) FOR [active]
GO
ALTER TABLE [dbo].[Classes] ADD  CONSTRAINT [DF_Classes_active]  DEFAULT ((1)) FOR [active]
GO
ALTER TABLE [dbo].[ExportFormat] ADD  CONSTRAINT [DF_ExportFormat_filetype]  DEFAULT (N'T') FOR [filetype]
GO
ALTER TABLE [dbo].[ExportFormat] ADD  CONSTRAINT [DF_exportformat_symbol]  DEFAULT (N',') FOR [symbol]
GO
ALTER TABLE [dbo].[ExportFormat] ADD  CONSTRAINT [DF_exportformat_qty]  DEFAULT ((1)) FOR [qty]
GO
ALTER TABLE [dbo].[ExportFormat] ADD  CONSTRAINT [DF_exportformat_usesysbolflg]  DEFAULT ((1)) FOR [usesymbolflg]
GO
ALTER TABLE [dbo].[ExportFormat] ADD  CONSTRAINT [DF_exportformat_saveflg]  DEFAULT ((1)) FOR [saveflg]
GO
ALTER TABLE [dbo].[ExportFormat] ADD  CONSTRAINT [DF_exportformat_openflg]  DEFAULT ((1)) FOR [openflg]
GO
ALTER TABLE [dbo].[ExportFormat] ADD  CONSTRAINT [DF_ExportFormat_eachfieldlenflg]  DEFAULT ((0)) FOR [eachfieldlenflg]
GO
ALTER TABLE [dbo].[Holiday] ADD  CONSTRAINT [DF_Holiday_holdate]  DEFAULT (getdate()) FOR [holdate]
GO
ALTER TABLE [dbo].[Level] ADD  CONSTRAINT [DF_Level_fullqty]  DEFAULT ((0)) FOR [fullqty]
GO
ALTER TABLE [dbo].[Level] ADD  CONSTRAINT [DF_Level_comeqty]  DEFAULT ((0)) FOR [comeqty]
GO
ALTER TABLE [dbo].[Level] ADD  CONSTRAINT [DF_level_active]  DEFAULT ((1)) FOR [active]
GO
ALTER TABLE [dbo].[Machine] ADD  CONSTRAINT [DF_Machine_machineno]  DEFAULT ((0)) FOR [machineno]
GO
ALTER TABLE [dbo].[Machine] ADD  CONSTRAINT [DF_Machine_password]  DEFAULT ((0)) FOR [password]
GO
ALTER TABLE [dbo].[Machine] ADD  CONSTRAINT [DF_Machine_autodownload]  DEFAULT ((1)) FOR [autodownloadtype]
GO
ALTER TABLE [dbo].[MachineModel] ADD  CONSTRAINT [DF_MqachineModel_fingerflg]  DEFAULT ((0)) FOR [fingerflg]
GO
ALTER TABLE [dbo].[MachineModel] ADD  CONSTRAINT [DF_MqachineModel_cardflg]  DEFAULT ((0)) FOR [cardflg]
GO
ALTER TABLE [dbo].[MachineModel] ADD  CONSTRAINT [DF_Table_1_face]  DEFAULT ((0)) FOR [faceflg]
GO
ALTER TABLE [dbo].[MachineModel] ADD  CONSTRAINT [DF_MachineModel_qtyrecord]  DEFAULT ((160000)) FOR [qtyrecord]
GO
ALTER TABLE [dbo].[MachineModel] ADD  DEFAULT ((0)) FOR [doorflg]
GO
ALTER TABLE [dbo].[School] ADD  CONSTRAINT [DF_School_satwork]  DEFAULT ((0)) FOR [satwork]
GO
ALTER TABLE [dbo].[School] ADD  CONSTRAINT [DF_School_sunwork]  DEFAULT ((0)) FOR [sunwork]
GO
ALTER TABLE [dbo].[School] ADD  CONSTRAINT [DF_School_autodownload]  DEFAULT ((0)) FOR [autodownload]
GO
ALTER TABLE [dbo].[School] ADD  CONSTRAINT [DF_School_autosendsms]  DEFAULT ((0)) FOR [autosendsms]
GO
ALTER TABLE [dbo].[School] ADD  CONSTRAINT [DF_School_sendpicflg]  DEFAULT ((0)) FOR [sendpicflg]
GO
ALTER TABLE [dbo].[School] ADD  CONSTRAINT [DF_School_connecttime]  DEFAULT ((10)) FOR [intervalmachine]
GO
ALTER TABLE [dbo].[School] ADD  CONSTRAINT [DF_School_smslimittime]  DEFAULT ((2)) FOR [smslimittime]
GO
ALTER TABLE [dbo].[School] ADD  CONSTRAINT [DF_School_sendaslevel]  DEFAULT ((0)) FOR [sendaslevel]
GO
ALTER TABLE [dbo].[School] ADD  CONSTRAINT [DF_School_cbbIntervaltime]  DEFAULT ((10)) FOR [intervaltime]
GO
ALTER TABLE [dbo].[School] ADD  CONSTRAINT [DF_school_active]  DEFAULT ((1)) FOR [active]
GO
ALTER TABLE [dbo].[School] ADD  CONSTRAINT [DF_School_usephotosendsms]  DEFAULT ((1)) FOR [usephotosendsms]
GO
ALTER TABLE [dbo].[Student] ADD  CONSTRAINT [DF_Student_enrollnumber]  DEFAULT ((0)) FOR [enrollnumber]
GO
ALTER TABLE [dbo].[Student] ADD  CONSTRAINT [DF_Student_shiftflg]  DEFAULT ((0)) FOR [shiftflg]
GO
ALTER TABLE [dbo].[Student] ADD  CONSTRAINT [DF_Student_active]  DEFAULT ((1)) FOR [active]
GO
ALTER TABLE [dbo].[StudentMachine] ADD  CONSTRAINT [DF_Table_1_machineno]  DEFAULT ((0)) FOR [enrollnumber]
GO
ALTER TABLE [dbo].[StudentMachine] ADD  CONSTRAINT [DF_Table_1_enrollnumber]  DEFAULT ((0)) FOR [machineno]
GO
ALTER TABLE [dbo].[StudentMachine] ADD  CONSTRAINT [DF_StudentMachine_fingerno]  DEFAULT ((0)) FOR [fingerno]
GO
ALTER TABLE [dbo].[StudentMachine] ADD  CONSTRAINT [DF_StudentMachine_privilege]  DEFAULT ((0)) FOR [privilege]
GO
ALTER TABLE [dbo].[StudentMachine] ADD  CONSTRAINT [DF_StudentMachine_password]  DEFAULT ((0)) FOR [password]
GO
ALTER TABLE [dbo].[StudentShift] ADD  CONSTRAINT [DF_StudentShift_enrollnumber]  DEFAULT ((0)) FOR [enrollnumber]
GO
ALTER TABLE [dbo].[StudentShift] ADD  CONSTRAINT [DF_StudentShift_adddate]  DEFAULT (getdate()) FOR [adddate]
GO
ALTER TABLE [dbo].[StudentTime] ADD  CONSTRAINT [DF_StudentTime_enrollnumber]  DEFAULT ((0)) FOR [enrollnumber]
GO
ALTER TABLE [dbo].[StudentTime] ADD  CONSTRAINT [DF_StudentTime_smstimes]  DEFAULT ((0)) FOR [smstimes]
GO
ALTER TABLE [dbo].[Transcantime] ADD  CONSTRAINT [DF_transcantime_enrollnumber]  DEFAULT ((0)) FOR [enrollnumber]
GO
ALTER TABLE [dbo].[Transcantime] ADD  CONSTRAINT [DF_transcantime_machineno]  DEFAULT ((0)) FOR [machineno]
GO
ALTER TABLE [dbo].[Transcantime] ADD  CONSTRAINT [DF_transcantime_fingerno]  DEFAULT ((0)) FOR [verifymode]
GO
ALTER TABLE [dbo].[Transcantime] ADD  CONSTRAINT [DF_Transcantime_adddate]  DEFAULT (getdate()) FOR [adddate]
GO
ALTER TABLE [dbo].[Transcantime] ADD  CONSTRAINT [DF_Transcantime_sendsmsflg_1]  DEFAULT ((0)) FOR [sendsmsflg]
GO
ALTER TABLE [dbo].[Transcantime] ADD  CONSTRAINT [DF_Transcantime_recordtostudent]  DEFAULT ((0)) FOR [recordtostudent]
GO
ALTER TABLE [dbo].[Transcantime] ADD  CONSTRAINT [DF_Transcantime_timetype]  DEFAULT (N'IN') FOR [timetype]
GO
ALTER TABLE [dbo].[Transcantime] ADD  CONSTRAINT [DF_Transcantime_webflg]  DEFAULT ((0)) FOR [webflg]
GO
ALTER TABLE [dbo].[TranscantimeBK] ADD  CONSTRAINT [DF_TranscantimeBK_recordtostudent]  DEFAULT ((0)) FOR [recordtostudent]
GO
ALTER TABLE [dbo].[TranscantimeBK] ADD  CONSTRAINT [DF_TranscantimeBK_timetype]  DEFAULT (N'IN') FOR [timetype]
GO
ALTER TABLE [dbo].[TranscantimeBK] ADD  CONSTRAINT [DF_TranscantimeBK_webflg]  DEFAULT ((0)) FOR [webflg]
GO
ALTER TABLE [dbo].[Users] ADD  CONSTRAINT [DF_Users_usertype]  DEFAULT ((0)) FOR [usertype]
GO

