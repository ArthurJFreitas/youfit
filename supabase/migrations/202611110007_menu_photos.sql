-- One photo per active menu item (public/images/menu/<slug>.webp).
update public.products p
set image_path = '/images/menu/' || p.slug || '.webp'
where p.slug in (
  'salada-fit','combo-salada-fit-bebida','combo-2-saladas-fit','combo-2-saladas-fit-coca-zero',
  'carne-desfiada','carne-suina-tiras','frango-grelhado','ovo-cozido-2-und',
  'tomate-cereja','pepino','cenoura-ralada','beterraba-ralada','cebola-roxa','manga','abacaxi',
  'azeitona','palmito','milho','ervilha','uva-passa','azeite','banana-assada','batata-doce-assada',
  'macarrao-cozido','queijo-mussarela','molho-ervas-fit','molho-mostarda-mel'
);
