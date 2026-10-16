import re, json, sys
from liquid import Environment, Template
from liquid.tag import Tag
from liquid.ast import Node
from liquid.token import TOKEN_TAG
src=open('/home/user/BLOGH.COM/theme/sections/product-ark8.liquid').read()
src=src.replace('!= blank','!= nil').replace('== blank','== nil')
src=re.sub(r'\{%\s*schema\s*%\}.*?\{%\s*endschema\s*%\}','',src,flags=re.S)
src=re.sub(r"\{%-?\s*form [^%]*?-?%\}",'<form id="ark-form" class="ark-form" method="post">',src)
src=re.sub(r"\{%-?\s*endform\s*-?%\}",'</form>',src)
src=src.replace('{{ form | payment_terms }}','')
env=Environment()
env.add_filter('image_url',lambda v,**k: v['url'] if isinstance(v,dict) else str(v))
env.add_filter('money',lambda v:'$%.2f'%(float(v)/100))
env.add_filter('json',lambda v: json.dumps(v))
env.add_filter('divided_by',lambda a,b: a/b)
mode=sys.argv[1]
def img(n,w,h): return {'url':n,'width':w,'height':h,'alt':'x'}
variants=[{'id':1,'options':['S'],'available':True,'price':8210,'compare_at_price':0,'inventory_management':None,'featured_media':{'id':0}},
 {'id':2,'options':['M'],'available':True,'price':8210,'compare_at_price':0,'inventory_management':None,'featured_media':{'id':0}},
 {'id':3,'options':['L'],'available':False,'price':8210,'compare_at_price':0,'inventory_management':None,'featured_media':{'id':0}}]
media=[] if mode=='ph' else [{'media_type':'image','id':11,'preview_image':img('model.png',700,1100)},{'media_type':'image','id':12,'preview_image':img('model2.png',700,1100)}]
product={'title':'The Lands Between Printed Bomber','handle':'x','tags':[],'description':'<p>Italian recycled polyamide bomber jacket with Lands Between Map all-over print. Double vertical front pockets and side pockets. Oversized fit.</p>','selected_or_first_available_variant':variants[0],'variants':variants,'media':media,
 'collections':{'first':{'title':'Coats & Jackets','url':'/c'}},'metafields':{'custom':{'materials':'<p>100% cotton</p>','packaging':None,'size_guide':None,'model_height':'185','model_size':'M'}},
 'options_with_values':[{'name':'Size','position':1,'values':['S','M','L'],'selected_value':'S'}],'has_only_default_variant':False}
ctx={'product':product,'collection':None,'routes':{'root_url':'/','all_products_collection_url':'/all','search_url':'/s','account_url':'/a','account_login_url':'/l','cart_url':'/cart'},
 'cart':{'item_count':1},'customer':None,'shop':{'shipping_policy':None,'refund_policy':None},
 'section':{'settings':{'canvas':'#E9E6E1','brand_name':'IZAVEN','menu':{'links':[{'title':'Shop','url':'/'},{'title':'Track your order','url':'/t'},{'title':'Contact','url':'/c'}]},'show_save':True,'blend_white':False,'size_guide_page':{'content':'<p>chart</p>'},'shipping_text':'<p>Made to order. Estimated delivery 5–10 days.</p>','left_x':2,'left_y':29,'right_x':98,'right_y':48}}}
html=env.from_string(src).render(**ctx)
page='<!doctype html><html><head><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><style>body{margin:0}</style></head><body><div class="page-wrapper">'+html+'</div></body></html>'
open('out_%s.html'%mode,'w').write(page)
print(len(page))
