-- Optional seed for an EMPTY `books` table (same 11 titles as Berlin Bulletin Books/Bücher).
-- If rows already exist, do NOT run this — you will duplicate books. Use the app or
-- `npm run scrape:books` to refresh ImageKit URLs on existing rows instead.
--
-- ImageKit base: mq26ahrml (`cms/books/...`). URLs match the last scrape upload.

INSERT INTO public.books (title, author, description, image_url) VALUES
  ('A Socialist Defector: From Harvard to Karl-Marx-Allee', 'Victor Grossman', 'Monthly Review Press, New York 2019, ISBN 978-5836773-8-4', 'https://ik.imagekit.io/mq26ahrml/cms/books/2019-a-socialist-defector_H_ZGav2tx.jpg'),
  ('Crossing the River: Vom Broadway zur Karl-Marx-Allee', 'Victor Grossman', 'Eine Autobiografie; Verlag Wiljo Heinen, 2014', 'https://ik.imagekit.io/mq26ahrml/cms/books/2014-crossing_the_river-deutsch_Pc8NSlLCS.jpg'),
  ('Rebel Girls: 34 amerikanische Frauen im Porträt', 'Victor Grossman', 'PapyRossa Verlag, 2013', 'https://ik.imagekit.io/mq26ahrml/cms/books/2013-rebel_girls_PiWqs9EdB.jpg'),
  ('Ein Ami blickt auf die DDR zurück', 'Victor Grossman', 'Spotless, 2011', 'https://ik.imagekit.io/mq26ahrml/cms/books/2011-ein_ami_blickt_auf_die_ddr_zurueck_Wz2bsAABh.jpg'),
  ('Madrid – du Wunderbare', 'Victor Grossman', 'Ein Amerikaner blättert in der Geschichte des Spanienkrieges; GNN Verlag, 2006', 'https://ik.imagekit.io/mq26ahrml/cms/books/2006-madrid_du_wunderbare_hE9pM4wB4.jpg'),
  ('Crossing the River: A Memoir of the American Left, the Cold War, and Life in East Germany', 'Victor Grossman', 'University of Massachusetts Press, 2003 (IN ENGLISH)', 'https://ik.imagekit.io/mq26ahrml/cms/books/2003-crossing_the_river-english_QRe4hUz9pj.jpg'),
  ('If I Had a Song: Lieder und Sänger der USA', 'Victor Grossman', 'Lied der Zeit, 1988, 1990', 'https://ik.imagekit.io/mq26ahrml/cms/books/1988-if_i_had_a_song_KmjrAcQgY.jpg'),
  ('Der Weg über die Grenze', 'Victor Grossman', 'Neues Leben, 1985', 'https://ik.imagekit.io/mq26ahrml/cms/books/1985-der_weg_ueber_die_grenze_HP24dXgDD.jpg'),
  ('Per Anhalter durch die USA', 'Victor Grossman', 'Neues Leben, 1976', 'https://ik.imagekit.io/mq26ahrml/cms/books/1976-per_anhalter_durch_die_usa_k9UZGHomx.jpg'),
  ('Von Manhattan bis Kalifornien: Aus der Geschichte der USA', 'Victor Grossman', 'Kinderbuchverlag, 1975, 1978', 'https://ik.imagekit.io/mq26ahrml/cms/books/1975-von_manhattan_bis_kalifornien_bjsoXWwav.jpg'),
  ('Nilpferd und Storch', 'Victor Grossman', 'Kinderbuchverlag, 1965', 'https://ik.imagekit.io/mq26ahrml/cms/books/1965-nilpferd_und_storch_nmYpDzW4a.jpg');
