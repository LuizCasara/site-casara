-- Carga histórica de dados reais do teste de temperamento
-- Fonte: backup do Telegram (lib/result.json)
-- Fórmula: Sanguineo=(Q+U)/2, Colerico=(Q+S)/2, Melancolico=(F+S)/2, Fleumatico=(F+U)/2
-- Excluídos: id:26 e id:27 (testes da Márcia)
-- Incluídos: id:97 e id:103 (resultados zerados — submissão sem respostas)
-- Total: 109 registros

INSERT INTO events (event_name, route, payload, created_at) VALUES

-- 2025-07-04
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Sanguineo","secondary":"Fleumatico","sanguineo":34,"colerico":25,"melancolico":16,"fleumatico":26}', '2025-07-04 14:13:22+00'),
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Melancolico","secondary":"Colerico","sanguineo":18,"colerico":25,"melancolico":32,"fleumatico":25}', '2025-07-04 15:28:59+00'),
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Sanguineo","secondary":"Colerico","sanguineo":30,"colerico":26,"melancolico":20,"fleumatico":25}', '2025-07-04 15:37:20+00'),
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Sanguineo","secondary":"Colerico","sanguineo":35,"colerico":27,"melancolico":15,"fleumatico":23}', '2025-07-04 15:55:24+00'),
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Fleumatico","secondary":"Melancolico","sanguineo":24,"colerico":14,"melancolico":27,"fleumatico":36}', '2025-07-04 16:18:31+00'),
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Colerico","secondary":"Sanguineo","sanguineo":26,"colerico":31,"melancolico":24,"fleumatico":19}', '2025-07-04 17:00:26+00'),
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Colerico","secondary":"Sanguineo","sanguineo":28,"colerico":30,"melancolico":23,"fleumatico":20}', '2025-07-04 17:41:41+00'),
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Colerico","secondary":"Sanguineo","sanguineo":29,"colerico":31,"melancolico":22,"fleumatico":20}', '2025-07-04 17:45:46+00'),
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Melancolico","secondary":"Fleumatico","sanguineo":21,"colerico":25,"melancolico":30,"fleumatico":26}', '2025-07-04 18:42:11+00'),
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Melancolico","secondary":"Fleumatico","sanguineo":21,"colerico":23,"melancolico":29,"fleumatico":27}', '2025-07-04 19:32:54+00'),
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Melancolico","secondary":"Fleumatico","sanguineo":19,"colerico":19,"melancolico":32,"fleumatico":31}', '2025-07-04 19:37:04+00'),
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Melancolico","secondary":"Fleumatico","sanguineo":18,"colerico":18,"melancolico":33,"fleumatico":33}', '2025-07-04 19:41:36+00'),
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Melancolico","secondary":"Fleumatico","sanguineo":17,"colerico":20,"melancolico":34,"fleumatico":31}', '2025-07-04 19:45:50+00'),
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Melancolico","secondary":"Fleumatico","sanguineo":16,"colerico":20,"melancolico":35,"fleumatico":31}', '2025-07-04 19:49:41+00'),
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Fleumatico","secondary":"Melancolico","sanguineo":18,"colerico":17,"melancolico":33,"fleumatico":33}', '2025-07-04 19:54:33+00'),
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Colerico","secondary":"Sanguineo","sanguineo":26,"colerico":29,"melancolico":24,"fleumatico":22}', '2025-07-04 20:50:30+00'),
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Melancolico","secondary":"Fleumatico","sanguineo":16,"colerico":18,"melancolico":35,"fleumatico":33}', '2025-07-04 21:31:27+00'),
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Melancolico","secondary":"Fleumatico","sanguineo":20,"colerico":21,"melancolico":30,"fleumatico":30}', '2025-07-04 22:39:21+00'),
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Melancolico","secondary":"Colerico","sanguineo":18,"colerico":25,"melancolico":32,"fleumatico":25}', '2025-07-04 23:28:28+00'),
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Melancolico","secondary":"Colerico","sanguineo":23,"colerico":25,"melancolico":28,"fleumatico":25}', '2025-07-04 23:37:25+00'),

-- 2025-07-05
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Fleumatico","secondary":"Melancolico","sanguineo":24,"colerico":21,"melancolico":26,"fleumatico":30}', '2025-07-05 11:12:23+00'),
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Sanguineo","secondary":"Colerico","sanguineo":33,"colerico":30,"melancolico":18,"fleumatico":20}', '2025-07-05 11:13:28+00'),
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Sanguineo","secondary":"Colerico","sanguineo":30,"colerico":29,"melancolico":21,"fleumatico":22}', '2025-07-05 11:16:30+00'),
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Colerico","secondary":"Sanguineo","sanguineo":26,"colerico":29,"melancolico":24,"fleumatico":22}', '2025-07-05 12:01:34+00'),
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Fleumatico","secondary":"Melancolico","sanguineo":24,"colerico":19,"melancolico":27,"fleumatico":31}', '2025-07-05 12:16:34+00'),
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Sanguineo","secondary":"Fleumatico","sanguineo":29,"colerico":22,"melancolico":22,"fleumatico":28}', '2025-07-05 12:16:57+00'),
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Sanguineo","secondary":"Fleumatico","sanguineo":27,"colerico":24,"melancolico":23,"fleumatico":27}', '2025-07-05 12:17:30+00'),
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Fleumatico","secondary":"Melancolico","sanguineo":25,"colerico":24,"melancolico":26,"fleumatico":27}', '2025-07-05 12:25:35+00'),
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Melancolico","secondary":"Fleumatico","sanguineo":16,"colerico":18,"melancolico":35,"fleumatico":32}', '2025-07-05 12:29:35+00'),
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Colerico","secondary":"Sanguineo","sanguineo":30,"colerico":33,"melancolico":20,"fleumatico":18}', '2025-07-05 12:42:28+00'),
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Sanguineo","secondary":"Colerico","sanguineo":27,"colerico":26,"melancolico":23,"fleumatico":24}', '2025-07-05 12:47:30+00'),
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Colerico","secondary":"Sanguineo","sanguineo":31,"colerico":31,"melancolico":20,"fleumatico":20}', '2025-07-05 13:21:47+00'),
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Sanguineo","secondary":"Colerico","sanguineo":32,"colerico":28,"melancolico":18,"fleumatico":23}', '2025-07-05 13:36:23+00'),
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Fleumatico","secondary":"Sanguineo","sanguineo":25,"colerico":18,"melancolico":25,"fleumatico":33}', '2025-07-05 13:39:41+00'),
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Melancolico","secondary":"Fleumatico","sanguineo":21,"colerico":23,"melancolico":29,"fleumatico":28}', '2025-07-05 13:40:19+00'),
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Colerico","secondary":"Sanguineo","sanguineo":25,"colerico":28,"melancolico":25,"fleumatico":22}', '2025-07-05 13:46:27+00'),
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Melancolico","secondary":"Colerico","sanguineo":23,"colerico":27,"melancolico":27,"fleumatico":23}', '2025-07-05 13:54:30+00'),
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Sanguineo","secondary":"Fleumatico","sanguineo":33,"colerico":24,"melancolico":18,"fleumatico":27}', '2025-07-05 13:57:03+00'),
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Sanguineo","secondary":"Colerico","sanguineo":31,"colerico":28,"melancolico":19,"fleumatico":23}', '2025-07-05 14:01:52+00'),
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Colerico","secondary":"Sanguineo","sanguineo":28,"colerico":30,"melancolico":22,"fleumatico":20}', '2025-07-05 14:39:03+00'),
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Melancolico","secondary":"Colerico","sanguineo":19,"colerico":26,"melancolico":31,"fleumatico":24}', '2025-07-05 14:40:04+00'),
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Melancolico","secondary":"Colerico","sanguineo":22,"colerico":26,"melancolico":28,"fleumatico":25}', '2025-07-05 14:47:34+00'),
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Melancolico","secondary":"Fleumatico","sanguineo":23,"colerico":25,"melancolico":27,"fleumatico":25}', '2025-07-05 14:52:49+00'),
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Colerico","secondary":"Sanguineo","sanguineo":30,"colerico":32,"melancolico":20,"fleumatico":18}', '2025-07-05 16:24:01+00'),
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Melancolico","secondary":"Fleumatico","sanguineo":12,"colerico":22,"melancolico":38,"fleumatico":29}', '2025-07-05 18:36:34+00'),
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Colerico","secondary":"Melancolico","sanguineo":21,"colerico":31,"melancolico":30,"fleumatico":20}', '2025-07-05 18:56:08+00'),
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Colerico","secondary":"Sanguineo","sanguineo":27,"colerico":27,"melancolico":24,"fleumatico":23}', '2025-07-05 19:29:24+00'),
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Melancolico","secondary":"Fleumatico","sanguineo":22,"colerico":25,"melancolico":29,"fleumatico":26}', '2025-07-05 22:02:03+00'),
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Sanguineo","secondary":"Colerico","sanguineo":28,"colerico":28,"melancolico":23,"fleumatico":23}', '2025-07-05 22:05:11+00'),
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Sanguineo","secondary":"Fleumatico","sanguineo":30,"colerico":24,"melancolico":20,"fleumatico":26}', '2025-07-05 22:10:21+00'),
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Melancolico","secondary":"Fleumatico","sanguineo":17,"colerico":19,"melancolico":34,"fleumatico":32}', '2025-07-05 22:46:29+00'),

-- 2025-07-06
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Sanguineo","secondary":"Colerico","sanguineo":37,"colerico":26,"melancolico":14,"fleumatico":24}', '2025-07-06 12:43:27+00'),
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Melancolico","secondary":"Colerico","sanguineo":19,"colerico":27,"melancolico":32,"fleumatico":23}', '2025-07-06 14:57:22+00'),
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Sanguineo","secondary":"Fleumatico","sanguineo":34,"colerico":20,"melancolico":16,"fleumatico":31}', '2025-07-06 15:11:12+00'),
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Fleumatico","secondary":"Sanguineo","sanguineo":26,"colerico":21,"melancolico":24,"fleumatico":30}', '2025-07-06 15:19:57+00'),
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Sanguineo","secondary":"Fleumatico","sanguineo":35,"colerico":23,"melancolico":15,"fleumatico":27}', '2025-07-06 21:00:05+00'),
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Sanguineo","secondary":"Colerico","sanguineo":29,"colerico":27,"melancolico":22,"fleumatico":24}', '2025-07-06 21:02:56+00'),
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Colerico","secondary":"Melancolico","sanguineo":23,"colerico":28,"melancolico":28,"fleumatico":23}', '2025-07-06 21:07:55+00'),
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Fleumatico","secondary":"Sanguineo","sanguineo":28,"colerico":22,"melancolico":22,"fleumatico":29}', '2025-07-06 21:19:18+00'),
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Fleumatico","secondary":"Melancolico","sanguineo":25,"colerico":21,"melancolico":25,"fleumatico":29}', '2025-07-06 21:27:00+00'),
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Melancolico","secondary":"Colerico","sanguineo":24,"colerico":26,"melancolico":27,"fleumatico":25}', '2025-07-06 21:32:21+00'),
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Fleumatico","secondary":"Melancolico","sanguineo":24,"colerico":22,"melancolico":26,"fleumatico":29}', '2025-07-06 22:44:45+00'),
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Fleumatico","secondary":"Sanguineo","sanguineo":26,"colerico":24,"melancolico":25,"fleumatico":26}', '2025-07-06 22:49:30+00'),
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Sanguineo","secondary":"Fleumatico","sanguineo":27,"colerico":25,"melancolico":24,"fleumatico":26}', '2025-07-06 23:07:46+00'),
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Sanguineo","secondary":"Fleumatico","sanguineo":26,"colerico":25,"melancolico":24,"fleumatico":25}', '2025-07-06 23:11:20+00'),
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Colerico","secondary":"Sanguineo","sanguineo":25,"colerico":26,"melancolico":25,"fleumatico":24}', '2025-07-06 23:14:14+00'),
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Sanguineo","secondary":"Colerico","sanguineo":26,"colerico":25,"melancolico":25,"fleumatico":25}', '2025-07-06 23:17:48+00'),
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Sanguineo","secondary":"Colerico","sanguineo":28,"colerico":26,"melancolico":22,"fleumatico":24}', '2025-07-06 23:24:07+00'),
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Sanguineo","secondary":"Fleumatico","sanguineo":29,"colerico":24,"melancolico":21,"fleumatico":26}', '2025-07-06 23:30:04+00'),
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Sanguineo","secondary":"Colerico","sanguineo":0,"colerico":0,"melancolico":0,"fleumatico":0}', '2025-07-06 23:31:43+00'),
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Sanguineo","secondary":"Colerico","sanguineo":28,"colerico":27,"melancolico":22,"fleumatico":24}', '2025-07-06 23:33:10+00'),

-- 2025-07-07
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Colerico","secondary":"Sanguineo","sanguineo":25,"colerico":28,"melancolico":25,"fleumatico":22}', '2025-07-07 01:27:42+00'),
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Fleumatico","secondary":"Sanguineo","sanguineo":25,"colerico":23,"melancolico":25,"fleumatico":27}', '2025-07-07 06:59:30+00'),
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Fleumatico","secondary":"Sanguineo","sanguineo":27,"colerico":23,"melancolico":24,"fleumatico":28}', '2025-07-07 07:07:41+00'),
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Sanguineo","secondary":"Fleumatico","sanguineo":34,"colerico":25,"melancolico":16,"fleumatico":26}', '2025-07-07 12:08:32+00'),
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Sanguineo","secondary":"Colerico","sanguineo":0,"colerico":0,"melancolico":0,"fleumatico":0}', '2025-07-07 12:16:32+00'),
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Fleumatico","secondary":"Sanguineo","sanguineo":26,"colerico":23,"melancolico":25,"fleumatico":27}', '2025-07-07 12:17:14+00'),
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Sanguineo","secondary":"Colerico","sanguineo":32,"colerico":26,"melancolico":18,"fleumatico":25}', '2025-07-07 20:11:20+00'),
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Fleumatico","secondary":"Melancolico","sanguineo":24,"colerico":20,"melancolico":27,"fleumatico":30}', '2025-07-07 21:05:19+00'),
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Sanguineo","secondary":"Fleumatico","sanguineo":36,"colerico":24,"melancolico":14,"fleumatico":26}', '2025-07-07 21:21:01+00'),
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Sanguineo","secondary":"Fleumatico","sanguineo":36,"colerico":25,"melancolico":14,"fleumatico":25}', '2025-07-07 21:24:08+00'),
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Sanguineo","secondary":"Fleumatico","sanguineo":33,"colerico":24,"melancolico":18,"fleumatico":26}', '2025-07-07 21:36:07+00'),

-- 2025-07-09
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Sanguineo","secondary":"Colerico","sanguineo":34,"colerico":29,"melancolico":17,"fleumatico":21}', '2025-07-09 13:19:09+00'),
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Sanguineo","secondary":"Colerico","sanguineo":35,"colerico":28,"melancolico":15,"fleumatico":22}', '2025-07-09 13:22:17+00'),
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Sanguineo","secondary":"Colerico","sanguineo":36,"colerico":27,"melancolico":15,"fleumatico":24}', '2025-07-09 13:50:44+00'),
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Colerico","secondary":"Sanguineo","sanguineo":25,"colerico":27,"melancolico":25,"fleumatico":24}', '2025-07-09 15:54:58+00'),

-- 2025-07-10
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Colerico","secondary":"Sanguineo","sanguineo":26,"colerico":31,"melancolico":25,"fleumatico":20}', '2025-07-10 20:29:43+00'),

-- 2025-07-16
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Fleumatico","secondary":"Melancolico","sanguineo":24,"colerico":23,"melancolico":27,"fleumatico":28}', '2025-07-16 00:40:02+00'),
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Melancolico","secondary":"Fleumatico","sanguineo":22,"colerico":23,"melancolico":28,"fleumatico":28}', '2025-07-16 22:11:33+00'),
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Colerico","secondary":"Sanguineo","sanguineo":31,"colerico":34,"melancolico":20,"fleumatico":17}', '2025-07-16 22:20:38+00'),

-- 2025-07-17
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Colerico","secondary":"Sanguineo","sanguineo":27,"colerico":28,"melancolico":23,"fleumatico":22}', '2025-07-17 16:10:53+00'),
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Fleumatico","secondary":"Sanguineo","sanguineo":26,"colerico":21,"melancolico":25,"fleumatico":30}', '2025-07-17 16:17:43+00'),

-- 2025-07-19
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Sanguineo","secondary":"Colerico","sanguineo":33,"colerico":29,"melancolico":18,"fleumatico":21}', '2025-07-19 22:15:25+00'),

-- 2025-07-21
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Sanguineo","secondary":"Colerico","sanguineo":28,"colerico":26,"melancolico":22,"fleumatico":24}', '2025-07-21 14:50:21+00'),

-- 2025-07-28
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Sanguineo","secondary":"Colerico","sanguineo":30,"colerico":26,"melancolico":21,"fleumatico":25}', '2025-07-28 13:16:31+00'),

-- 2025-10-05
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Sanguineo","secondary":"Colerico","sanguineo":28,"colerico":27,"melancolico":23,"fleumatico":23}', '2025-10-05 17:20:10+00'),

-- 2025-10-06
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Melancolico","secondary":"Fleumatico","sanguineo":22,"colerico":25,"melancolico":28,"fleumatico":26}', '2025-10-06 14:19:35+00'),
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Melancolico","secondary":"Colerico","sanguineo":22,"colerico":27,"melancolico":29,"fleumatico":24}', '2025-10-06 14:24:10+00'),
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Fleumatico","secondary":"Melancolico","sanguineo":24,"colerico":24,"melancolico":26,"fleumatico":27}', '2025-10-06 14:52:09+00'),
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Melancolico","secondary":"Colerico","sanguineo":24,"colerico":26,"melancolico":27,"fleumatico":24}', '2025-10-06 19:34:29+00'),

-- 2026-01-21
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Sanguineo","secondary":"Colerico","sanguineo":30,"colerico":28,"melancolico":21,"fleumatico":22}', '2026-01-21 13:20:30+00'),

-- 2026-02-02
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Sanguineo","secondary":"Colerico","sanguineo":36,"colerico":30,"melancolico":14,"fleumatico":21}', '2026-02-02 18:39:30+00'),
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Melancolico","secondary":"Fleumatico","sanguineo":18,"colerico":20,"melancolico":33,"fleumatico":30}', '2026-02-02 18:48:25+00'),

-- 2026-02-13
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Colerico","secondary":"Sanguineo","sanguineo":27,"colerico":28,"melancolico":24,"fleumatico":22}', '2026-02-13 11:43:44+00'),

-- 2026-03-20
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Fleumatico","secondary":"Melancolico","sanguineo":24,"colerico":20,"melancolico":27,"fleumatico":31}', '2026-03-20 10:29:55+00'),

-- 2026-04-01
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Sanguineo","secondary":"Fleumatico","sanguineo":27,"colerico":24,"melancolico":23,"fleumatico":27}', '2026-04-01 17:55:25+00'),

-- 2026-04-22
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Melancolico","secondary":"Fleumatico","sanguineo":20,"colerico":21,"melancolico":30,"fleumatico":30}', '2026-04-22 01:48:41+00'),

-- 2026-05-26
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Melancolico","secondary":"Fleumatico","sanguineo":17,"colerico":17,"melancolico":34,"fleumatico":34}', '2026-05-26 20:33:22+00'),
('temperament_completed', '/app/descubra-seu-temperamento', '{"primary":"Fleumatico","secondary":"Melancolico","sanguineo":24,"colerico":18,"melancolico":27,"fleumatico":33}', '2026-05-26 20:38:10+00')

;
