import discord
from discord.ext import commands
import aiohttp
import io
import os

# إعداد الصلاحيات
intents = discord.Intents.default()
intents.message_content = True
bot = commands.Bot(command_prefix="!", intents=intents)

# القالب الخاص بالسكربت (تم دمج الكود الذي أرسلته)
LUA_TEMPLATE = """-- discord.gg/69ms
-- made by eko
-- Generated via Discord Bot

local getsenv = getsenv or false
if (getsenv == false) then return LocalPlayer:Kick("Unsuported executor. Error: getsenv is not supported") end

-- الإعدادات الافتراضية
getgenv().Flags = {{
    ["only-functions"] = false,
    ["only-values"] = false,
    ["no-functions"] = false,
    ["no-tables"] = false,
    ["no-userdata"] = false,
    ["no-upvalues"] = false,
    ["no-writing"] = false,
    ["no-printing"] = false
}}
getgenv().FilePath = {target_path}

local Flags = getgenv().Flags
local FilePath = getgenv().FilePath

if type(Flags) ~= "table" then error("Flags table not provided") end
if typeof(FilePath) ~= "Instance" then error("FilePath must be a valid Instance") end

local ok, err = pcall(function()
    if not FilePath then error("FilePath is nil") end
    FilePath:GetFullName()
end)

if not ok then
    warn("Provide a valid script path in FilePath! (" .. tostring(err) .. ")")
    return
end

local output = {{}}
local visited = {{}}

local function w(str) table.insert(output, str) end

local function allowed(t)
    if Flags["only-functions"] then return t == "function" end
    if Flags["only-values"] then return t ~= "function" and t ~= "table" and t ~= "userdata" end
    if t == "function" and Flags["no-functions"] then return false end  
    if t == "table" and Flags["no-tables"] then return false end  
    if t == "userdata" and Flags["no-userdata"] then return false end  
    return true
end

local function safe_tostring(val)
    local ok, str = pcall(tostring, val)
    return ok and str or "<unprintable>"
end

local function dump_table(tbl, prefix)
    if visited[tbl] then w(prefix .. " = <visited>") return end
    visited[tbl] = true
    local functions, values, tables, userdata, upvalues = {{}}, {{}}, {{}}, {{}}, {{}}  
    for k,v in pairs(tbl) do  
        local key = prefix ~= "" and (prefix .. "." .. tostring(k)) or tostring(k)  
        local t = typeof(v)  
        if t == "table" then  
            if allowed(t) then tables[key] = v end  
            if not Flags["no-tables"] and not Flags["only-functions"] and not Flags["only-values"] then dump_table(v, key) end  
        elif t == "function" then  
            if allowed(t) then  
                functions[key] = v  
                if not Flags["no-upvalues"] then  
                    local i = 1  
                    while true do  
                        local success, name, val = pcall(function() return debug.getupvalue(v, i) end)  
                        if not success or not name then break end  
                        table.insert(upvalues, safe_tostring(key) .. "." .. safe_tostring(name) .. " = " .. (val ~= nil and safe_tostring(val) or "<nil>"))  
                        i = i + 1  
                    end  
                end  
            end  
        elif t == "userdata" then if allowed(t) then userdata[key] = v end  
        else if allowed(t) then values[key] = v end end  
    end  
    if next(functions) then w("-- FUNCTIONS --") for k,v in pairs(functions) do w(k .. " = function " .. k .. "(...) " .. safe_tostring(v)) end end  
    if next(values) then w("-- VALUES --") for k,v in pairs(values) do w(k .. " = " .. safe_tostring(v)) end end  
    if next(tables) then w("-- TABLES --") for k,v in pairs(tables) do w(k .. " = table") end end  
    if next(userdata) then w("-- USERDATA --") for k,v in pairs(userdata) do w(k .. " = userdata " .. safe_tostring(v)) end end  
    if next(upvalues) then w("-- UPVALUES --") for _,v in ipairs(upvalues) do w(v) end end
end

local Env = getsenv(FilePath)
print(FilePath.Name .. " ENV DUMP START")
dump_table(Env, "")
print(FilePath.Name .. " ENV DUMP END")

local result = table.concat(output, "\\n")
if not Flags["no-printing"] then print(result) end
if not Flags["no-writing"] then writefile(FilePath.Name .. ".txt", "-- " .. FilePath.Name .. " dumped!\\n\\n" .. result) end
"""

async def fetch_url_content(url):
    """جلب النص من الروابط مثل Pastebin"""
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as response:
            if response.status == 200:
                return await response.text()
            return None

@bot.event
async def on_ready():
    print(f'✅ البوت يعمل الآن باسم: {bot.user}')

@bot.command()
async def make(ctx, *, input_data: str = None):
    """
    أمر صنع السكربت.
    مثال: !make game.Players.LocalPlayer.PlayerGui.ScreenGui
    """
    if not input_data and not ctx.message.attachments:
        return await ctx.send("⚠️ أرسل مسار السكربت (مثال: `game.Players...`) أو ارفع ملفاً نصياً.")

    target = input_data

    # إذا رفع ملف
    if ctx.message.attachments:
        attachment = ctx.message.attachments[0]
        target = await attachment.read()
        target = target.decode("utf-8").strip()

    # إذا أرسل رابط
    elif input_data and input_data.startswith("http"):
        content = await fetch_url_content(input_data)
        if content:
            target = content.strip()
        else:
            return await ctx.send("❌ فشل جلب البيانات من الرابط.")

    # تجهيز الكود النهائي
    # إذا كان المسار لا يبدأ بـ game، نضعه بين علامات تنصيص (كاسم ملف)
    path_value = target if "game" in target.lower() else f'"{target}"'
    
    final_code = LUA_TEMPLATE.replace("{target_path}", path_value)

    # إرسال الملف للمستخدم
    with io.BytesIO(final_code.encode()) as file:
        await ctx.send(
            content=f"🚀 **تم تجهيز السكربت!**\nالمسار المستهدف: `{target[:50]}`",
            file=discord.File(file, "69ms_Dumper.lua")
        )

# تشغيل البوت باستخدام التوكن من Variables في Railway
TOKEN = os.getenv("DISCORD_TOKEN")
if TOKEN:
    bot.run(TOKEN)
else:
    print("❌ خطأ: لم يتم العثور على DISCORD_TOKEN في إعدادات البيئة.")
